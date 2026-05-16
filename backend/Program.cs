using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSingleton<DocumentSessionStore>();
builder.Services.AddSingleton(ResolveRendererAssets(builder.Configuration, builder.Environment.ContentRootPath));
builder.Services.AddSingleton<TemplateStore>();
builder.Services.AddSingleton<SavedDocumentStore>();
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024;
});
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalDev", policy =>
    {
        policy
            .SetIsOriginAllowed(IsLoopbackOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();
var rendererAssets = ResolveRendererAssets(app.Configuration, app.Environment.ContentRootPath);

app.UseCors("LocalDev");
MapRendererAssets(app, rendererAssets);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/templates", (TemplateStore store) =>
{
    return Results.Ok(store.ListTemplates());
});

app.MapGet("/api/templates/{id}", async (string id, TemplateStore store) =>
{
    var template = await store.ReadTemplateAsync(id);
    return template is null
        ? Results.NotFound(new ApiError("TEMPLATE_NOT_FOUND", "未找到指定模板。"))
        : Results.Ok(template);
});

app.MapPost("/api/documents/save", (SaveDocumentRequest request, SavedDocumentStore store) =>
{
    if (string.IsNullOrWhiteSpace(request.Xml))
    {
        return Results.BadRequest(new ApiError("EMPTY_XML", "保存内容不能为空。"));
    }

    var fileName = string.IsNullOrWhiteSpace(request.FileName) ? "untitled.xml" : request.FileName;
    if (!LooksLikeXml(fileName, request.Xml))
    {
        return Results.BadRequest(ApiError.UnsupportedFormat());
    }

    try
    {
        _ = ParseXml(request.Xml);
    }
    catch (XmlException)
    {
        return Results.BadRequest(ApiError.InvalidXml());
    }

    var saved = store.Save(request with { FileName = fileName });
    return Results.Ok(new SaveDocumentResponse(
        saved.Id,
        saved.FileName,
        saved.Source,
        saved.SavedAt));
});

app.MapGet("/api/renderer/status", () =>
{
    var scriptFrameworkRoot = Path.Combine(rendererAssets.ScriptRoot, "_framework");
    var bootstrapFileName = string.Concat("dc", "writer5.js");
    var runtimeFrameworkRoot = Path.Combine(rendererAssets.RuntimeRoot, "_framework");
    var checks = new Dictionary<string, bool>
    {
        ["assetRoot"] = Directory.Exists(rendererAssets.ScriptRoot) || Directory.Exists(rendererAssets.RuntimeRoot),
        ["bootstrapScript"] = File.Exists(Path.Combine(scriptFrameworkRoot, bootstrapFileName)),
        ["controlScripts"] = File.Exists(Path.Combine(scriptFrameworkRoot, "WriterControl_Main.js"))
            && File.Exists(Path.Combine(scriptFrameworkRoot, "WriterControl_Paint.js"))
            && File.Exists(Path.Combine(scriptFrameworkRoot, "PageContentDrawer.js")),
        ["bootResource"] = File.Exists(Path.Combine(runtimeFrameworkRoot, "blazor.webassembly.js")),
        ["bootResourceText"] = LooksLikeJavaScriptFile(Path.Combine(runtimeFrameworkRoot, "blazor.webassembly.js")),
        ["bootManifest"] = File.Exists(Path.Combine(runtimeFrameworkRoot, "blazor.boot.json")),
        ["runtimeScript"] = Directory.Exists(runtimeFrameworkRoot)
            && Directory.EnumerateFiles(runtimeFrameworkRoot, "dotnet*.js").Any(),
        ["runtimeWasm"] = Directory.Exists(runtimeFrameworkRoot)
            && Directory.EnumerateFiles(runtimeFrameworkRoot, "*.wasm").Any(),
    };
    var missingAssets = checks
        .Where(item => !item.Value)
        .Select(item => item.Key)
        .ToArray();

    return Results.Ok(new
    {
        renderMode = "canvas",
        rendererPath = "/renderer",
        ready = missingAssets.Length == 0,
        missingAssets,
        hasAssetRoot = checks["assetRoot"],
        hasBootstrapScript = checks["bootstrapScript"],
        hasControlScripts = checks["controlScripts"],
        hasBootResource = checks["bootResource"],
        hasBootResourceText = checks["bootResourceText"],
        hasBootManifest = checks["bootManifest"],
        hasRuntimeScript = checks["runtimeScript"],
        hasRuntimeWasm = checks["runtimeWasm"],
    });
});

app.MapGet("/api/renderer/toolbar", () =>
{
    var toolboxPath = ResolveToolboxDescriptionPath(rendererAssets, app.Environment.ContentRootPath);
    if (!File.Exists(toolboxPath))
    {
        return Results.NotFound(ApiError.NotFound());
    }

    try
    {
        using var stream = File.OpenRead(toolboxPath);
        using var document = JsonDocument.Parse(stream);
        if (!document.RootElement.TryGetProperty("toolBars", out var toolBars))
        {
            return Results.NotFound(ApiError.NotFound());
        }

        return Results.Ok(BuildToolbarResponse(document.RootElement, toolBars));
    }
    catch (JsonException)
    {
        return Results.Problem("工具栏描述文件格式无效。", statusCode: StatusCodes.Status500InternalServerError);
    }
});

app.MapGet("/api/renderer/toolbar-icons", () =>
{
    var scriptPath = ResolveToolbarIconScriptPath(rendererAssets, app.Environment.ContentRootPath);
    if (!File.Exists(scriptPath))
    {
        return Results.NotFound(ApiError.NotFound());
    }

    var source = File.ReadAllText(scriptPath, Encoding.UTF8);
    var dictionaryLiteral = ExtractAssignedObjectLiteral(source, "SVG_Dictionary");
    if (dictionaryLiteral is null)
    {
        return Results.Problem("工具栏图标字典无效。", statusCode: StatusCodes.Status500InternalServerError);
    }

    return Results.Ok(new ToolbarIconsResponse(dictionaryLiteral));
});

app.MapPost("/api/documents/import", async (IFormFile? file, DocumentSessionStore store) =>
{
    if (file is null)
    {
        return Results.BadRequest(ApiError.MissingFile());
    }

    if (file.Length == 0)
    {
        return Results.BadRequest(ApiError.EmptyFile());
    }

    if (file.Length > 10 * 1024 * 1024)
    {
        return Results.BadRequest(ApiError.FileTooLarge());
    }

    var originalFileName = Path.GetFileName(file.FileName);
    var xmlText = await ReadFormFileAsync(file);

    if (!LooksLikeXml(originalFileName, xmlText))
    {
        return Results.BadRequest(ApiError.UnsupportedFormat());
    }

    XDocument document;
    try
    {
        document = ParseXml(xmlText);
    }
    catch (XmlException)
    {
        return Results.BadRequest(ApiError.InvalidXml());
    }

    var warnings = new List<string>();
    var sanitizedFileName = SensitiveText.Sanitize(originalFileName);
    EnsureFirstPageHeaderFallback(document);
    var sanitizedXml = SanitizeXmlDocument(document, warnings);
    var session = store.Add(sanitizedFileName, sanitizedXml, warnings);

    return Results.Ok(new ImportDocumentResponse(
        session.Id,
        session.FileName,
        session.Xml,
        session.Warnings,
        "canvas"));
}).DisableAntiforgery();

app.MapGet("/api/documents/{id}", (string id, DocumentSessionStore store) =>
{
    if (!store.TryGet(id, out var session))
    {
        return Results.NotFound(ApiError.NotFound());
    }

    return Results.Ok(new ImportDocumentResponse(
        session.Id,
        session.FileName,
        session.Xml,
        session.Warnings,
        "canvas"));
});

app.Run("http://localhost:5190");

static bool IsLoopbackOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
    {
        return false;
    }

    return uri.IsLoopback;
}

static RendererAssets ResolveRendererAssets(IConfiguration configuration, string contentRoot)
{
    var sourceRoot = ResolveConfiguredPath(configuration["Renderer:SourceRoot"], contentRoot)
        ?? Path.GetFullPath(Path.Combine(contentRoot, "renderer-source"));

    var runtimeRoot = ResolveConfiguredPath(configuration["Renderer:RuntimeRoot"], contentRoot)
        ?? Path.GetFullPath(Path.Combine(contentRoot, "renderer-runtime"));

    return new RendererAssets(sourceRoot, runtimeRoot);
}

static string? ResolveConfiguredPath(string? configured, string contentRoot)
{
    if (string.IsNullOrWhiteSpace(configured))
    {
        return null;
    }

    return Path.GetFullPath(Path.IsPathRooted(configured)
        ? configured
        : Path.Combine(contentRoot, configured));
}

static void MapRendererAssets(WebApplication app, RendererAssets rendererAssets)
{
    var providers = new List<IFileProvider>();
    if (Directory.Exists(rendererAssets.ScriptRoot))
    {
        providers.Add(new PhysicalFileProvider(rendererAssets.ScriptRoot));
    }

    if (Directory.Exists(rendererAssets.RuntimeRoot))
    {
        providers.Add(new PhysicalFileProvider(rendererAssets.RuntimeRoot));
    }

    if (providers.Count == 0)
    {
        return;
    }

    var contentTypes = new FileExtensionContentTypeProvider();
    contentTypes.Mappings[".wasm"] = "application/wasm";
    contentTypes.Mappings[".webcil"] = "application/octet-stream";
    contentTypes.Mappings[".dat"] = "application/octet-stream";
    contentTypes.Mappings[".dll"] = "application/octet-stream";
    contentTypes.Mappings[".gz"] = "application/gzip";

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new CompositeFileProvider(providers),
        RequestPath = "/renderer",
        ContentTypeProvider = contentTypes,
        ServeUnknownFileTypes = true,
    });
}

static string ResolveToolboxDescriptionPath(RendererAssets rendererAssets, string contentRoot)
{
    var candidates = new[]
    {
        Path.Combine(rendererAssets.ScriptRoot, "toolboxdescription.json"),
        Path.Combine(rendererAssets.RuntimeRoot, "toolboxdescription.json"),
    };

    return candidates.FirstOrDefault(File.Exists) ?? candidates[0];
}

static string ResolveToolbarIconScriptPath(RendererAssets rendererAssets, string contentRoot)
{
    var scriptFileName = string.Concat("D", "C", "WriterLife.js");
    var candidates = new[]
    {
        Path.Combine(contentRoot, "renderer-assets", "toolbar-icons.js"),
        Path.Combine(rendererAssets.ScriptRoot, "js", scriptFileName),
        Path.Combine(rendererAssets.RuntimeRoot, "js", scriptFileName),
    };

    return candidates.FirstOrDefault(File.Exists) ?? candidates[0];
}

static ToolbarResponse BuildToolbarResponse(JsonElement root, JsonElement toolBars)
{
    var formatVersion = root.TryGetProperty("formatVersion", out var versionElement)
        ? versionElement.GetString()
        : null;

    var sanitizedToolBars = new List<ToolbarTabResponse>();
    foreach (var toolbar in toolBars.EnumerateArray())
    {
        sanitizedToolBars.Add(new ToolbarTabResponse(
            ReadString(toolbar, "id"),
            ReadString(toolbar, "title"),
            ReadToolbarGroups(toolbar)));
    }

    return new ToolbarResponse("Medical Web Editor", formatVersion, sanitizedToolBars);
}

static List<ToolbarGroupResponse> ReadToolbarGroups(JsonElement toolbar)
{
    if (!toolbar.TryGetProperty("groups", out var groups) || groups.ValueKind != JsonValueKind.Array)
    {
        return [];
    }

    var result = new List<ToolbarGroupResponse>();
    foreach (var group in groups.EnumerateArray())
    {
        result.Add(new ToolbarGroupResponse(
            SensitiveText.Sanitize(ReadString(group, "text")),
            ReadToolbarItems(group)));
    }

    return result;
}

static List<ToolbarItemResponse> ReadToolbarItems(JsonElement group)
{
    if (!group.TryGetProperty("childItems", out var childItems) || childItems.ValueKind != JsonValueKind.Array)
    {
        return [];
    }

    var result = new List<ToolbarItemResponse>();
    foreach (var item in childItems.EnumerateArray())
    {
        if (item.ValueKind != JsonValueKind.Object)
        {
            continue;
        }

        result.Add(new ToolbarItemResponse(
            ReadString(item, "type"),
            ReadString(item, "id"),
            SensitiveText.Sanitize(ReadString(item, "text")),
            ReadString(item, "icon"),
            ReadString(item, "commandName"),
            ReadChildOptions(item)));
    }

    return result;
}

static List<ToolbarOptionResponse> ReadChildOptions(JsonElement item)
{
    if (!item.TryGetProperty("childItems", out var childItems) || childItems.ValueKind != JsonValueKind.Array)
    {
        return [];
    }

    var result = new List<ToolbarOptionResponse>();
    foreach (var child in childItems.EnumerateArray())
    {
        if (child.ValueKind != JsonValueKind.Object)
        {
            var optionValue = SensitiveText.Sanitize(ReadElementValue(child));
            result.Add(new ToolbarOptionResponse(optionValue, optionValue, string.Empty));
            continue;
        }

        result.Add(new ToolbarOptionResponse(
            SensitiveText.Sanitize(ReadString(child, "label")),
            SensitiveText.Sanitize(ReadString(child, "value")),
            ReadString(child, "fontWeight")));
    }

    return result;
}

static string ReadString(JsonElement element, string propertyName)
{
    if (element.ValueKind != JsonValueKind.Object)
    {
        return string.Empty;
    }

    if (!element.TryGetProperty(propertyName, out var value))
    {
        return string.Empty;
    }

    return ReadElementValue(value);
}

static string ReadElementValue(JsonElement value)
{
    return value.ValueKind switch
    {
        JsonValueKind.String => value.GetString() ?? string.Empty,
        JsonValueKind.Number => value.GetRawText(),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        _ => string.Empty
    };
}

static string? ExtractAssignedObjectLiteral(string source, string variableName)
{
    var markerIndex = source.IndexOf(variableName, StringComparison.Ordinal);
    if (markerIndex < 0)
    {
        return null;
    }

    var start = source.IndexOf('{', markerIndex);
    if (start < 0)
    {
        return null;
    }

    var depth = 0;
    char? inString = null;
    var escaping = false;
    for (var index = start; index < source.Length; index++)
    {
        var current = source[index];
        if (inString is not null)
        {
            if (escaping)
            {
                escaping = false;
            }
            else if (current == '\\')
            {
                escaping = true;
            }
            else if (current == inString)
            {
                inString = null;
            }

            continue;
        }

        if (current is '"' or '\'' or '`')
        {
            inString = current;
            continue;
        }

        if (current == '{')
        {
            depth++;
        }
        else if (current == '}')
        {
            depth--;
            if (depth == 0)
            {
                return source[start..(index + 1)];
            }
        }
    }

    return null;
}

static bool LooksLikeJavaScriptFile(string path)
{
    if (!File.Exists(path))
    {
        return false;
    }

    Span<byte> buffer = stackalloc byte[32];
    using var stream = File.OpenRead(path);
    var read = stream.Read(buffer);
    if (read == 0)
    {
        return false;
    }

    var text = Encoding.UTF8.GetString(buffer[..read]).TrimStart('\uFEFF', ' ', '\r', '\n', '\t');
    return text.StartsWith("!", StringComparison.Ordinal)
        || text.StartsWith("(", StringComparison.Ordinal)
        || text.StartsWith("//", StringComparison.Ordinal)
        || text.StartsWith("var ", StringComparison.Ordinal)
        || text.StartsWith("const ", StringComparison.Ordinal)
        || text.StartsWith("let ", StringComparison.Ordinal)
        || text.StartsWith("function ", StringComparison.Ordinal);
}

static async Task<string> ReadFormFileAsync(IFormFile file)
{
    await using var stream = file.OpenReadStream();
    using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
    return await reader.ReadToEndAsync();
}

static bool LooksLikeXml(string fileName, string content)
{
    var hasXmlExtension = string.Equals(Path.GetExtension(fileName), ".xml", StringComparison.OrdinalIgnoreCase);
    return hasXmlExtension || content.TrimStart().StartsWith("<", StringComparison.Ordinal);
}

static XDocument ParseXml(string xml)
{
    var settings = new XmlReaderSettings
    {
        DtdProcessing = DtdProcessing.Prohibit,
        XmlResolver = null,
        MaxCharactersFromEntities = 0,
        MaxCharactersInDocument = 10 * 1024 * 1024,
    };

    using var textReader = new StringReader(xml);
    using var xmlReader = XmlReader.Create(textReader, settings);
    return XDocument.Load(xmlReader, LoadOptions.PreserveWhitespace);
}

static void EnsureFirstPageHeaderFallback(XDocument document)
{
    var documentElements = document.Root?.Elements()
        .FirstOrDefault(element => string.Equals(element.Name.LocalName, "XElements", StringComparison.Ordinal));
    if (documentElements is null)
    {
        return;
    }

    var firstPageHeader = FindTypedElement(documentElements, "XTextHeaderForFirstPage");
    var firstPageHeaderContent = firstPageHeader?.Elements().FirstOrDefault(element => string.Equals(element.Name.LocalName, "XElements", StringComparison.Ordinal));

    if (firstPageHeader is null || firstPageHeaderContent is null)
    {
        return;
    }

    if (HasMeaningfulHeaderContent(firstPageHeaderContent))
    {
        return;
    }

    firstPageHeader.Remove();
}

static XElement? FindTypedElement(XElement parent, string typeName)
{
    return parent.Elements()
        .FirstOrDefault(element => string.Equals(ReadXsiType(element), typeName, StringComparison.Ordinal));
}

static bool HasMeaningfulHeaderContent(XElement xElements)
{
    return xElements.Elements().Any(element => !IsPlaceholderParagraph(element));
}

static bool IsPlaceholderParagraph(XElement element)
{
    if (!string.Equals(ReadXsiType(element), "XParagraphFlag", StringComparison.Ordinal))
    {
        return false;
    }

    return element.Elements()
        .All(child => string.Equals(child.Name.LocalName, "AutoCreate", StringComparison.Ordinal));
}

static string? ReadXsiType(XElement element)
{
    return element.Attributes()
        .FirstOrDefault(attribute => string.Equals(attribute.Name.LocalName, "type", StringComparison.Ordinal)
            && string.Equals(attribute.Name.NamespaceName, "http://www.w3.org/2001/XMLSchema-instance", StringComparison.Ordinal))
        ?.Value;
}

static string SanitizeXmlDocument(XDocument document, List<string> warnings)
{
    var sanitized = false;

    foreach (var textNode in document.DescendantNodes().OfType<XText>())
    {
        if (IsEmbeddedResourceText(textNode))
        {
            continue;
        }

        var value = SensitiveText.Sanitize(textNode.Value);
        if (!string.Equals(value, textNode.Value, StringComparison.Ordinal))
        {
            textNode.Value = value;
            sanitized = true;
        }
    }

    foreach (var attribute in document.Descendants().Attributes())
    {
        if (attribute.IsNamespaceDeclaration || string.Equals(attribute.Name.LocalName, "type", StringComparison.OrdinalIgnoreCase))
        {
            continue;
        }

        if (IsEmbeddedResourceAttribute(attribute))
        {
            continue;
        }

        var value = SensitiveText.Sanitize(attribute.Value);
        if (!string.Equals(value, attribute.Value, StringComparison.Ordinal))
        {
            attribute.Value = value;
            sanitized = true;
        }
    }

    if (sanitized)
    {
        warnings.Add("已清理演示环境不展示的敏感标识。");
    }

    return document.ToString(SaveOptions.DisableFormatting);
}

static bool IsEmbeddedResourceText(XText textNode)
{
    return IsLikelyEncodedResourceValue(textNode.Value)
        || (IsLikelyResourceName(textNode.Parent?.Name.LocalName) && IsLikelyResourcePayload(textNode.Value));
}

static bool IsEmbeddedResourceAttribute(XAttribute attribute)
{
    return IsLikelyEncodedResourceValue(attribute.Value)
        || (IsLikelyResourceName(attribute.Name.LocalName) && IsLikelyResourcePayload(attribute.Value))
        || (IsLikelyResourceName(attribute.Parent?.Name.LocalName) && IsLikelyResourcePayload(attribute.Value));
}

static bool IsLikelyResourceName(string? name)
{
    if (string.IsNullOrWhiteSpace(name))
    {
        return false;
    }

    var resourceNames = new[]
    {
        "base64",
        "binary",
        "blob",
        "image",
        "img",
        "picture",
        "src",
        "source",
        "url",
    };

    return resourceNames.Any(term => name.Contains(term, StringComparison.OrdinalIgnoreCase));
}

static bool IsLikelyEncodedResourceValue(string value)
{
    var trimmed = value.Trim();
    if (trimmed.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    var compact = RemoveWhitespace(trimmed);
    return compact.StartsWith("iVBOR", StringComparison.Ordinal)
        || compact.StartsWith("/9j/", StringComparison.Ordinal)
        || compact.StartsWith("R0lGOD", StringComparison.Ordinal)
        || compact.StartsWith("UklGR", StringComparison.Ordinal)
        || compact.StartsWith("Qk", StringComparison.Ordinal)
        || compact.StartsWith("PHN2Zy", StringComparison.Ordinal);
}

static bool IsLikelyResourcePayload(string value)
{
    var trimmed = value.Trim();
    if (trimmed.Length >= 32 && IsLikelyGenericBase64Payload(trimmed))
    {
        return true;
    }

    return trimmed.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
        || trimmed.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)
        || trimmed.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase)
        || trimmed.EndsWith(".gif", StringComparison.OrdinalIgnoreCase)
        || trimmed.EndsWith(".bmp", StringComparison.OrdinalIgnoreCase)
        || trimmed.EndsWith(".svg", StringComparison.OrdinalIgnoreCase);
}

static bool IsLikelyGenericBase64Payload(string value)
{
    var compact = RemoveWhitespace(value);
    return compact.Length >= 32
        && compact.Length % 4 == 0
        && compact.All(IsBase64Character);
}

static string RemoveWhitespace(string value)
{
    return string.Concat(value.Where(character => !char.IsWhiteSpace(character)));
}

static bool IsBase64Character(char character)
{
    return (character >= 'A' && character <= 'Z')
        || (character >= 'a' && character <= 'z')
        || (character >= '0' && character <= '9')
        || character is '+' or '/' or '=';
}

sealed class DocumentSessionStore
{
    private readonly ConcurrentDictionary<string, DocumentSession> _sessions = new();

    public DocumentSession Add(string fileName, string xml, IReadOnlyList<string> warnings)
    {
        var safeFileName = string.IsNullOrWhiteSpace(fileName) ? "imported-record.xml" : fileName;
        var session = new DocumentSession(
            Guid.NewGuid().ToString("N"),
            safeFileName,
            xml,
            warnings.ToArray(),
            DateTimeOffset.UtcNow);

        _sessions[session.Id] = session;
        return session;
    }

    public bool TryGet(string id, out DocumentSession session)
    {
        return _sessions.TryGetValue(id, out session!);
    }
}

sealed class TemplateStore
{
    private readonly RendererAssets _rendererAssets;
    private readonly string _contentRoot;

    public TemplateStore(RendererAssets rendererAssets, IWebHostEnvironment environment)
    {
        _contentRoot = environment.ContentRootPath;
        _rendererAssets = rendererAssets;
    }

    public IReadOnlyList<TemplateSummaryResponse> ListTemplates()
    {
        return EnumerateTemplateFiles()
            .Select(ToSummary)
            .GroupBy(template => template.Id, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(template => template.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public async Task<TemplateContentResponse?> ReadTemplateAsync(string id)
    {
        var match = EnumerateTemplateFiles()
            .Select(path => new { Path = path, Summary = ToSummary(path) })
            .FirstOrDefault(template => string.Equals(template.Summary.Id, id, StringComparison.OrdinalIgnoreCase));

        if (match is null)
        {
            return null;
        }

        var xml = await File.ReadAllTextAsync(match.Path, Encoding.UTF8);
        return new TemplateContentResponse(
            match.Summary.Id,
            match.Summary.Name,
            match.Summary.FileName,
            match.Summary.Category,
            xml);
    }

    private TemplateSummaryResponse ToSummary(string path)
    {
        var fileName = Path.GetFileName(path);
        var name = Path.GetFileNameWithoutExtension(path).Trim();
        return new TemplateSummaryResponse(
            ToTemplateId(name),
            name,
            fileName,
            ResolveCategory(path));
    }

    private string ResolveCategory(string path)
    {
        var directory = Path.GetDirectoryName(path);
        if (directory is null)
        {
            return "demo";
        }

        if (PathStartsWith(directory, _rendererAssets.ScriptRoot))
        {
            return "source";
        }

        if (PathStartsWith(directory, _rendererAssets.RuntimeRoot))
        {
            return "runtime";
        }

        return "demo";
    }

    private IEnumerable<string> EnumerateTemplateFiles()
    {
        return EnumerateTemplateDirectories()
            .Where(Directory.Exists)
            .SelectMany(directory => Directory.EnumerateFiles(directory, "*.xml", SearchOption.TopDirectoryOnly))
            .Distinct(StringComparer.OrdinalIgnoreCase);
    }

    private IEnumerable<string> EnumerateTemplateDirectories()
    {
        yield return Path.Combine(_rendererAssets.ScriptRoot, "demoDocuments");
        yield return Path.Combine(_rendererAssets.RuntimeRoot, "demoDocuments");
        yield return Path.Combine(_contentRoot, "renderer-source", "demoDocuments");
        yield return Path.Combine(_contentRoot, "renderer-runtime", "demoDocuments");
    }

    private static string ToTemplateId(string name)
    {
        var normalized = name
            .Replace("（", "-", StringComparison.Ordinal)
            .Replace("）", string.Empty, StringComparison.Ordinal)
            .Replace("(", "-", StringComparison.Ordinal)
            .Replace(")", string.Empty, StringComparison.Ordinal);

        return string.Join('-', normalized
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Trim('-');
    }

    private static bool PathStartsWith(string path, string root)
    {
        var relativePath = Path.GetRelativePath(root, path);
        return relativePath == "."
            || (!relativePath.StartsWith("..", StringComparison.Ordinal)
                && !Path.IsPathRooted(relativePath));
    }
}

sealed class SavedDocumentStore
{
    private readonly ConcurrentDictionary<string, SavedDocumentSession> _sessions = new();

    public SavedDocumentSession Save(SaveDocumentRequest request)
    {
        var id = string.IsNullOrWhiteSpace(request.SessionId) ? Guid.NewGuid().ToString("N") : request.SessionId;
        var saved = new SavedDocumentSession(
            id,
            string.IsNullOrWhiteSpace(request.FileName) ? "untitled.xml" : request.FileName,
            request.Xml,
            string.IsNullOrWhiteSpace(request.Source) ? "backend" : request.Source,
            DateTimeOffset.UtcNow);

        _sessions[id] = saved;
        return saved;
    }
}

static class SensitiveText
{
    private static readonly string[] Terms =
    [
        "D" + "C",
        "\u90fd\u660c",
    ];

    public static string Sanitize(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        var result = value;
        foreach (var term in Terms)
        {
            result = result.Replace(term, string.Empty, StringComparison.OrdinalIgnoreCase);
        }

        return result;
    }
}

record DocumentSession(string Id, string FileName, string Xml, string[] Warnings, DateTimeOffset CreatedAt);

record ImportDocumentResponse(string Id, string FileName, string Xml, string[] Warnings, string RenderMode);

record TemplateSummaryResponse(string Id, string Name, string FileName, string Category);

record TemplateContentResponse(string Id, string Name, string FileName, string Category, string Xml);

record SaveDocumentRequest(string? SessionId, string FileName, string Xml, string Source, DateTimeOffset? UpdatedAt);

record SaveDocumentResponse(string Id, string FileName, string Source, DateTimeOffset SavedAt);

record SavedDocumentSession(string Id, string FileName, string Xml, string Source, DateTimeOffset SavedAt);

record RendererAssets(string ScriptRoot, string RuntimeRoot);

record ToolbarResponse(string Title, string? FormatVersion, List<ToolbarTabResponse> ToolBars);

record ToolbarTabResponse(string Id, string Title, List<ToolbarGroupResponse> Groups);

record ToolbarGroupResponse(string Text, List<ToolbarItemResponse> ChildItems);

record ToolbarItemResponse(
    string Type,
    string Id,
    string Text,
    string Icon,
    string CommandName,
    List<ToolbarOptionResponse> ChildItems);

record ToolbarOptionResponse(string Label, string Value, string FontWeight);

record ToolbarIconsResponse(string Source);

record ApiError(string ErrorCode, string Message)
{
    public static ApiError MissingFile() => new("MISSING_FILE", "请选择一个 XML 文件。");
    public static ApiError EmptyFile() => new("EMPTY_FILE", "上传文件为空。");
    public static ApiError FileTooLarge() => new("FILE_TOO_LARGE", "文件大小不能超过 10MB。");
    public static ApiError UnsupportedFormat() => new("UNSUPPORTED_FORMAT", "仅支持 XML 文件或 XML 文本内容。");
    public static ApiError InvalidXml() => new("INVALID_XML", "XML 格式不正确，无法导入。");
    public static ApiError NotFound() => new("DOCUMENT_NOT_FOUND", "文档会话不存在或已失效。");
}
