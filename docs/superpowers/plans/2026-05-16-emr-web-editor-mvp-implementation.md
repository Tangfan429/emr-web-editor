# EMR Web Editor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the EMR Web Editor MVP: a Vue editor shell that reuses EMRWriterLite/WriterControl for clinical document editing, templates, commands, validation, saving, preview, and printing.

**Architecture:** Keep WriterControl as the editing/rendering kernel and add a typed Vue application shell around it. Frontend code should route all WriterControl calls through `WriterControlAdapter`, all toolbar behavior through a command registry, and all document state through a session composable/store. Backend stays lightweight: it exposes template list/content and a demo save endpoint while continuing to host `/renderer/*`.

**Tech Stack:** Vue 3 + Composition API + `<script setup lang="ts">`, Vite, TypeScript, Vitest, lucide-vue-next, .NET 9 Minimal API.

---

## File Structure

Create or modify the following files. Keep each unit small and testable.

### Backend

- Modify `backend/Program.cs`
  - Add `TemplateStore` and `SavedDocumentStore` registrations.
  - Add `GET /api/templates`, `GET /api/templates/{id}`, and `POST /api/documents/save`.
  - Keep existing `/api/documents/import`, `/api/documents/{id}`, and `/renderer/*` behavior intact.
  - Extend records for template and save responses near existing response records.

### Frontend Types and Adapter

- Modify `frontend/src/types/document.ts`
  - Add document source, session, save, template, validation, and command types.

- Create `frontend/src/utils/writerControlAdapter.ts`
  - Encapsulate all direct WriterControl calls.
  - Expose typed methods for load, command execution, command status, save XML, print preview, print, and event attachment.

- Create `frontend/src/utils/writerControlAdapter.test.ts`
  - Unit-test success and failure behavior for save, command execution, preview, and unavailable writer target.

### Frontend Services and Composables

- Create `frontend/src/services/templateService.ts`
  - Fetch template list and XML content.

- Create `frontend/src/services/templateService.test.ts`
  - Test response parsing and HTTP failure handling with mocked `fetch`.

- Create `frontend/src/services/documentSaveService.ts`
  - Get latest XML from adapter, run validation, download XML, and save to backend.

- Create `frontend/src/services/documentSaveService.test.ts`
  - Test local download, backend save payload, validation-blocked save, and adapter failure.

- Create `frontend/src/services/documentValidationService.ts`
  - Parse XML for required input fields and return structured validation issues.

- Create `frontend/src/services/documentValidationService.test.ts`
  - Test empty required fields, filled required fields, invalid XML, and issue ids.

- Create `frontend/src/composables/useDocumentSession.ts`
  - Own current document state, dirty state, saving/loading flags, validation issues, and session transitions.

- Create `frontend/src/composables/useDocumentSession.test.ts`
  - Test load from imported XML, load from template, dirty state transitions, and save state transitions.

### Frontend Commands and Components

- Create `frontend/src/components/editor/ribbonCommands.ts`
  - Define Ribbon tabs, groups, command ids, WriterControl command names, command parameters, and disabled-state rules.

- Create `frontend/src/components/editor/ribbonCommands.test.ts`
  - Test command lookup, command conversion, disabled-state behavior, and required command coverage.

- Create `frontend/src/components/editor/TemplatePanel.vue`
  - Display template list, loading/error state, and local import action.

- Create `frontend/src/components/editor/EditorStatusBar.vue`
  - Display file name, save state, render mode, validation state, print preview state, and zoom.

- Create `frontend/src/components/editor/ValidationPanel.vue`
  - Display validation issue summary and emit issue-selection events.

- Modify `frontend/src/components/editor/ImportToolbar.vue`
  - Evolve current toolbar into command-driven Ribbon while preserving renderer toolbar loading and existing print/import controls during migration.
  - Prefer lucide icons where available and keep command text compact.

- Modify `frontend/src/components/editor/EditorShell.vue`
  - Become the composition surface for template panel, toolbar, editor canvas, validation panel, status bar, adapter, session, save, and print flows.
  - Keep state minimal and derived values in computed refs.

- Modify `frontend/src/components/editor/CanvasPreview.vue`
  - Continue emitting `writerReady`, `modeChange`, and `renderError`.
  - No direct save or command logic belongs here.

### Documentation

- Modify `docs/superpowers/specs/2026-05-16-emr-web-editor-mvp-design.md` only if implementation discovers a real spec correction.
- Create implementation notes only if a task changes an approved scope decision.

## Task 1: Backend Template And Save API

**Files:**
- Modify: `backend/Program.cs`

- [ ] **Step 1: Add backend API records and stores**

Add these records near the existing record declarations at the bottom of `backend/Program.cs`:

```csharp
record TemplateSummaryResponse(string Id, string Name, string FileName, string Category);

record TemplateContentResponse(string Id, string Name, string FileName, string Category, string Xml);

record SaveDocumentRequest(string? SessionId, string FileName, string Xml, string Source, DateTimeOffset? UpdatedAt);

record SaveDocumentResponse(string Id, string FileName, string Source, DateTimeOffset SavedAt);

record SavedDocumentSession(string Id, string FileName, string Xml, string Source, DateTimeOffset SavedAt);
```

Add these store classes below `DocumentSessionStore`:

```csharp
sealed class TemplateStore
{
    private readonly RendererAssets _rendererAssets;
    private readonly string _contentRoot;

    public TemplateStore(RendererAssets rendererAssets, IWebHostEnvironment environment)
    {
        _rendererAssets = rendererAssets;
        _contentRoot = environment.ContentRootPath;
    }

    public IReadOnlyList<TemplateSummaryResponse> ListTemplates()
    {
        return GetTemplateFiles()
            .Select(file =>
            {
                var fileName = Path.GetFileName(file);
                var id = Path.GetFileNameWithoutExtension(fileName)
                    .Replace(' ', '-')
                    .Replace('（', '-')
                    .Replace('）', '-');
                return new TemplateSummaryResponse(id, Path.GetFileNameWithoutExtension(fileName), fileName, "EMRWriterLite");
            })
            .OrderBy(template => template.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<TemplateContentResponse?> ReadTemplateAsync(string id)
    {
        var template = ListTemplates().FirstOrDefault(item => string.Equals(item.Id, id, StringComparison.OrdinalIgnoreCase));
        if (template is null)
        {
            return null;
        }

        var file = GetTemplateFiles().FirstOrDefault(path => string.Equals(Path.GetFileName(path), template.FileName, StringComparison.OrdinalIgnoreCase));
        if (file is null)
        {
            return null;
        }

        var xml = await File.ReadAllTextAsync(file);
        return new TemplateContentResponse(template.Id, template.Name, template.FileName, template.Category, xml);
    }

    private IEnumerable<string> GetTemplateFiles()
    {
        var candidates = new[]
        {
            Path.Combine(_rendererAssets.ScriptRoot, "demoDocuments"),
            Path.Combine(_rendererAssets.RuntimeRoot, "demoDocuments"),
            Path.Combine(_contentRoot, "renderer-source", "demoDocuments"),
            Path.Combine(_contentRoot, "renderer-runtime", "demoDocuments")
        };

        return candidates
            .Where(Directory.Exists)
            .SelectMany(directory => Directory.EnumerateFiles(directory, "*.xml", SearchOption.TopDirectoryOnly))
            .Distinct(StringComparer.OrdinalIgnoreCase);
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
            string.IsNullOrWhiteSpace(request.Source) ? "unknown" : request.Source,
            DateTimeOffset.UtcNow);
        _sessions[id] = saved;
        return saved;
    }
}
```

- [ ] **Step 2: Register backend stores**

Add registrations near the existing `DocumentSessionStore` registration:

```csharp
builder.Services.AddSingleton<TemplateStore>();
builder.Services.AddSingleton<SavedDocumentStore>();
```

- [ ] **Step 3: Map template and save endpoints**

Add routes after `/api/health` and before renderer routes:

```csharp
app.MapGet("/api/templates", (TemplateStore store) =>
{
    return Results.Ok(store.ListTemplates());
});

app.MapGet("/api/templates/{id}", async (string id, TemplateStore store) =>
{
    var template = await store.ReadTemplateAsync(id);
    return template is null
        ? Results.NotFound(new ApiError("template_not_found", "未找到指定模板。"))
        : Results.Ok(template);
});

app.MapPost("/api/documents/save", (SaveDocumentRequest request, SavedDocumentStore store) =>
{
    if (string.IsNullOrWhiteSpace(request.Xml))
    {
        return Results.BadRequest(new ApiError("empty_xml", "保存内容不能为空。"));
    }

    if (!LooksLikeXml(request.FileName, request.Xml))
    {
        return Results.BadRequest(new ApiError("invalid_xml", "保存内容不是有效的 XML 文档。"));
    }

    try
    {
        ParseXml(request.Xml);
    }
    catch (InvalidDataException exception)
    {
        return Results.BadRequest(new ApiError("invalid_xml", exception.Message));
    }

    var saved = store.Save(request);
    return Results.Ok(new SaveDocumentResponse(saved.Id, saved.FileName, saved.Source, saved.SavedAt));
});
```

- [ ] **Step 4: Run backend build**

Run:

```powershell
dotnet build .\backend\backend.csproj
```

Expected: build exits with code 0.

- [ ] **Step 5: Commit backend API work**

```powershell
git add backend/Program.cs
git commit -m "添加模板与文档保存接口"
```

## Task 2: WriterControl Adapter

**Files:**
- Modify: `frontend/src/types/document.ts`
- Create: `frontend/src/utils/writerControlAdapter.ts`
- Create: `frontend/src/utils/writerControlAdapter.test.ts`

- [ ] **Step 1: Extend shared document and WriterControl types**

Replace or extend `frontend/src/types/document.ts` with these additional exports while keeping the existing `ImportedDocument` interface:

```ts
export interface ImportedDocument {
  id: string
  fileName: string
  xml: string
  warnings: string[]
  renderMode: 'canvas'
}

export type DocumentSource = 'template' | 'local' | 'imported' | 'unknown'

export interface EditorDocument {
  id: string
  fileName: string
  xml: string
  warnings: string[]
  source: DocumentSource
  templateId?: string
}

export interface TemplateSummary {
  id: string
  name: string
  fileName: string
  category: string
}

export interface TemplateContent extends TemplateSummary {
  xml: string
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed'

export interface SaveDocumentResponse {
  id: string
  fileName: string
  source: string
  savedAt: string
}

export interface ValidationIssue {
  id: string
  fieldId: string
  fieldName: string
  message: string
  severity: 'error' | 'warning'
}

export type EditorCommandId =
  | 'undo'
  | 'redo'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'selectAll'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'fontSize'
  | 'fontName'
  | 'foreColor'
  | 'backColor'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'insertInputField'
  | 'insertDateTime'
  | 'insertCheckbox'
  | 'insertRadio'
  | 'insertPageBreak'
  | 'insertPageInfo'
  | 'insertTable'
  | 'deleteTable'
  | 'insertRowUp'
  | 'insertRowDown'
  | 'insertColumnLeft'
  | 'insertColumnRight'
  | 'mergeCell'
  | 'splitCell'
  | 'tableProperties'
  | 'rowProperties'
  | 'cellProperties'

export interface WriterCommandPayload {
  commandName: string
  showUI: boolean
  parameter?: unknown
  executor?: 'dc' | 'legacy'
}
```

- [ ] **Step 2: Write failing adapter tests**

Create `frontend/src/utils/writerControlAdapter.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import {
  createWriterControlAdapter,
  type WriterControlTarget,
} from './writerControlAdapter'

describe('writerControlAdapter', () => {
  it('reports unavailable writer target', () => {
    const adapter = createWriterControlAdapter(null)

    expect(adapter.isAvailable()).toBe(false)
    expect(adapter.saveXml()).toEqual({
      ok: false,
      message: '外部编辑器尚未加载，无法执行该操作。',
      reason: 'writer-unavailable',
    })
  })

  it('executes DC commands through WriterControl', () => {
    const target: WriterControlTarget = {
      DCExecuteCommand: vi.fn(() => true),
    }
    const adapter = createWriterControlAdapter(target)

    expect(adapter.executeCommand({ commandName: 'bold', showUI: false, parameter: true })).toEqual({ ok: true })
    expect(target.DCExecuteCommand).toHaveBeenCalledWith('bold', false, true)
  })

  it('executes legacy commands when requested', () => {
    const target: WriterControlTarget = {
      ExecuteCommand: vi.fn(() => true),
    }
    const adapter = createWriterControlAdapter(target)

    expect(adapter.executeCommand({
      commandName: 'Table_SplitCellExt',
      showUI: true,
      parameter: null,
      executor: 'legacy',
    })).toEqual({ ok: true })
    expect(target.ExecuteCommand).toHaveBeenCalledWith('Table_SplitCellExt', true, null)
  })

  it('saves XML through SaveDocumentToString', () => {
    const target: WriterControlTarget = {
      SaveDocumentToString: vi.fn(() => '<XTextDocument />'),
    }
    const adapter = createWriterControlAdapter(target)

    expect(adapter.saveXml()).toEqual({ ok: true, xml: '<XTextDocument />' })
  })

  it('normalizes failed WriterControl command results', () => {
    const target: WriterControlTarget = {
      DCExecuteCommand: vi.fn(() => false),
    }
    const adapter = createWriterControlAdapter(target)

    expect(adapter.executeCommand({ commandName: 'bold', showUI: false, parameter: true })).toEqual({
      ok: false,
      message: '编辑器未接受命令：bold。',
      reason: 'command-rejected',
    })
  })
})
```

- [ ] **Step 3: Run adapter test to verify it fails**

Run:

```powershell
cd .\frontend
npm test -- writerControlAdapter.test.ts
```

Expected: FAIL because `writerControlAdapter.ts` does not exist.

- [ ] **Step 4: Implement adapter**

Create `frontend/src/utils/writerControlAdapter.ts`:

```ts
import type { WriterCommandPayload } from '../types/document'
import type { WriterPrintTarget } from './writerPrint'
import {
  closeWriterPrintPreview,
  printWriterDocument,
  showWriterPrintPreview,
} from './writerPrint'

export interface WriterControlTarget extends WriterPrintTarget {
  LoadDocumentFromString?: (
    xml: string,
    format?: string,
    specifyLoadPart?: unknown,
    errorCallback?: ((result: unknown) => void) | null
  ) => boolean | void
  SaveDocumentToString?: (options?: unknown, textOptions?: unknown) => string
  DCExecuteCommand?: (commandName: string, showUI: boolean, parameter?: unknown) => boolean | void
  ExecuteCommand?: (commandName: string, showUI: boolean, parameter?: unknown) => boolean | void
  GetCommandStatus?: (commandName: string) => unknown
  addEventListener?: HTMLElement['addEventListener']
  removeEventListener?: HTMLElement['removeEventListener']
}

export type WriterAdapterFailureReason =
  | 'writer-unavailable'
  | 'load-api-unavailable'
  | 'save-api-unavailable'
  | 'command-api-unavailable'
  | 'command-rejected'
  | 'save-empty'

export type WriterAdapterResult =
  | { ok: true }
  | { ok: false; reason: WriterAdapterFailureReason; message: string }

export type WriterSaveResult =
  | { ok: true; xml: string }
  | { ok: false; reason: WriterAdapterFailureReason; message: string }

const unavailableResult: WriterAdapterResult = {
  ok: false,
  reason: 'writer-unavailable',
  message: '外部编辑器尚未加载，无法执行该操作。',
}

const unavailableSaveResult: WriterSaveResult = {
  ok: false,
  reason: 'writer-unavailable',
  message: '外部编辑器尚未加载，无法执行该操作。',
}

export function createWriterControlAdapter(target: WriterControlTarget | null) {
  function isAvailable() {
    return Boolean(target)
  }

  function loadXml(xml: string): WriterAdapterResult {
    if (!target) return unavailableResult
    if (typeof target.LoadDocumentFromString !== 'function') {
      return {
        ok: false,
        reason: 'load-api-unavailable',
        message: '外部编辑器不支持 XML 加载接口。',
      }
    }

    return normalizeBooleanResult(
      target.LoadDocumentFromString(xml, 'xml', null, null),
      '编辑器未接受 XML 加载请求。',
      'command-rejected',
    )
  }

  function executeCommand(payload: WriterCommandPayload): WriterAdapterResult {
    if (!target) return unavailableResult

    const executor = payload.executor === 'legacy' ? target.ExecuteCommand : target.DCExecuteCommand
    if (typeof executor !== 'function') {
      return {
        ok: false,
        reason: 'command-api-unavailable',
        message: `外部编辑器不支持命令接口：${payload.commandName}。`,
      }
    }

    return normalizeBooleanResult(
      executor.call(target, payload.commandName, payload.showUI, payload.parameter ?? null),
      `编辑器未接受命令：${payload.commandName}。`,
      'command-rejected',
    )
  }

  function getCommandStatus(commandName: string) {
    if (!target || typeof target.GetCommandStatus !== 'function') {
      return null
    }

    return target.GetCommandStatus(commandName)
  }

  function saveXml(): WriterSaveResult {
    if (!target) return unavailableSaveResult
    if (typeof target.SaveDocumentToString !== 'function') {
      return {
        ok: false,
        reason: 'save-api-unavailable',
        message: '外部编辑器不支持 XML 保存接口。',
      }
    }

    const xml = target.SaveDocumentToString({ FileFormat: 'XML' })
    if (!xml) {
      return {
        ok: false,
        reason: 'save-empty',
        message: '外部编辑器返回的 XML 为空。',
      }
    }

    return { ok: true, xml }
  }

  return {
    isAvailable,
    loadXml,
    executeCommand,
    getCommandStatus,
    saveXml,
    print: () => printWriterDocument(target),
    openPrintPreview: () => showWriterPrintPreview(target),
    closePrintPreview: () => closeWriterPrintPreview(target),
  }
}

function normalizeBooleanResult(
  result: boolean | void,
  message: string,
  reason: WriterAdapterFailureReason,
): WriterAdapterResult {
  if (result === false) {
    return { ok: false, reason, message }
  }

  return { ok: true }
}
```

- [ ] **Step 5: Run adapter tests**

Run:

```powershell
cd .\frontend
npm test -- writerControlAdapter.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit adapter work**

```powershell
git add frontend/src/types/document.ts frontend/src/utils/writerControlAdapter.ts frontend/src/utils/writerControlAdapter.test.ts
git commit -m "封装 WriterControl 适配层"
```

## Task 3: Template Service And Backend Integration

**Files:**
- Create: `frontend/src/services/templateService.ts`
- Create: `frontend/src/services/templateService.test.ts`

- [ ] **Step 1: Write failing template service tests**

Create `frontend/src/services/templateService.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTemplateContent, fetchTemplates } from './templateService'

describe('templateService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches template summaries', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{ id: 'admission', name: 'Admission Record', fileName: 'Admission Record.xml', category: 'EMRWriterLite' }],
    })))

    await expect(fetchTemplates()).resolves.toEqual([
      { id: 'admission', name: 'Admission Record', fileName: 'Admission Record.xml', category: 'EMRWriterLite' },
    ])
  })

  it('fetches template content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'admission', name: 'Admission Record', fileName: 'Admission Record.xml', category: 'EMRWriterLite', xml: '<XTextDocument />' }),
    })))

    await expect(fetchTemplateContent('admission')).resolves.toEqual({
      id: 'admission',
      name: 'Admission Record',
      fileName: 'Admission Record.xml',
      category: 'EMRWriterLite',
      xml: '<XTextDocument />',
    })
  })

  it('throws readable errors for failed responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: '未找到指定模板。' }),
    })))

    await expect(fetchTemplateContent('missing')).rejects.toThrow('未找到指定模板。')
  })
})
```

- [ ] **Step 2: Run template service test to verify it fails**

Run:

```powershell
cd .\frontend
npm test -- templateService.test.ts
```

Expected: FAIL because `templateService.ts` does not exist.

- [ ] **Step 3: Implement template service**

Create `frontend/src/services/templateService.ts`:

```ts
import type { TemplateContent, TemplateSummary } from '../types/document'

export async function fetchTemplates(): Promise<TemplateSummary[]> {
  const response = await fetch('/api/templates')
  return readJsonResponse<TemplateSummary[]>(response, '模板列表加载失败。')
}

export async function fetchTemplateContent(id: string): Promise<TemplateContent> {
  const response = await fetch(`/api/templates/${encodeURIComponent(id)}`)
  return readJsonResponse<TemplateContent>(response, '模板内容加载失败。')
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(readErrorMessage(payload) || fallbackMessage)
  }

  return payload as T
}

function readErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: unknown }).message || '')
  }

  return ''
}
```

- [ ] **Step 4: Run template service tests**

Run:

```powershell
cd .\frontend
npm test -- templateService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit template service work**

```powershell
git add frontend/src/services/templateService.ts frontend/src/services/templateService.test.ts
git commit -m "添加模板服务"
```

## Task 4: Validation And Save Services

**Files:**
- Create: `frontend/src/services/documentValidationService.ts`
- Create: `frontend/src/services/documentValidationService.test.ts`
- Create: `frontend/src/services/documentSaveService.ts`
- Create: `frontend/src/services/documentSaveService.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `frontend/src/services/documentValidationService.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateDocumentXml } from './documentValidationService'

describe('documentValidationService', () => {
  it('reports empty required input fields', () => {
    const xml = `
      <XTextDocument>
        <XElements>
          <XInputField ID="field-1" Name="主诉" Required="true">
            <InnerValue></InnerValue>
          </XInputField>
        </XElements>
      </XTextDocument>
    `

    expect(validateDocumentXml(xml)).toEqual([
      {
        id: 'required-field-1',
        fieldId: 'field-1',
        fieldName: '主诉',
        message: '必填项“主诉”不能为空。',
        severity: 'error',
      },
    ])
  })

  it('does not report filled required fields', () => {
    const xml = `
      <XTextDocument>
        <XInputField ID="field-1" Name="主诉" Required="true">
          <InnerValue>头痛三天</InnerValue>
        </XInputField>
      </XTextDocument>
    `

    expect(validateDocumentXml(xml)).toEqual([])
  })

  it('reports invalid XML as a validation issue', () => {
    expect(validateDocumentXml('<XTextDocument>')).toEqual([
      {
        id: 'invalid-xml',
        fieldId: 'document',
        fieldName: 'XML',
        message: '文档 XML 无法解析。',
        severity: 'error',
      },
    ])
  })
})
```

- [ ] **Step 2: Implement validation service**

Create `frontend/src/services/documentValidationService.ts`:

```ts
import type { ValidationIssue } from '../types/document'

export function validateDocumentXml(xml: string): ValidationIssue[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) {
    return [{
      id: 'invalid-xml',
      fieldId: 'document',
      fieldName: 'XML',
      message: '文档 XML 无法解析。',
      severity: 'error',
    }]
  }

  const fields = Array.from(document.querySelectorAll('XInputField, InputField, inputfield'))
  return fields
    .filter(isRequiredField)
    .filter((field) => !readFieldValue(field))
    .map((field, index) => {
      const fieldId = readAttribute(field, ['ID', 'Id', 'id']) || `field-${index + 1}`
      const fieldName = readAttribute(field, ['Name', 'Title', 'name']) || fieldId
      return {
        id: `required-${fieldId}`,
        fieldId,
        fieldName,
        message: `必填项“${fieldName}”不能为空。`,
        severity: 'error' as const,
      }
    })
}

function isRequiredField(field: Element) {
  const value = readAttribute(field, ['Required', 'required', 'NotNull', 'notNull', 'RequiredValue'])
  return value === 'true' || value === 'True' || value === '1'
}

function readFieldValue(field: Element) {
  const innerValue = field.querySelector('InnerValue, innerValue')
  const directValue = readAttribute(field, ['Value', 'value'])
  return (innerValue?.textContent || directValue || '').trim()
}

function readAttribute(element: Element, names: string[]) {
  for (const name of names) {
    const value = element.getAttribute(name)
    if (value) return value
  }

  return ''
}
```

- [ ] **Step 3: Run validation tests**

Run:

```powershell
cd .\frontend
npm test -- documentValidationService.test.ts
```

Expected: PASS.

- [ ] **Step 4: Write failing save service tests**

Create `frontend/src/services/documentSaveService.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveDocumentToBackend } from './documentSaveService'

describe('documentSaveService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('blocks backend save when validation fails', async () => {
    const adapter = {
      saveXml: vi.fn(() => ({ ok: true as const, xml: '<XTextDocument>' })),
    }

    await expect(saveDocumentToBackend(adapter, {
      sessionId: '1',
      fileName: 'record.xml',
      source: 'local',
    })).resolves.toEqual({
      ok: false,
      reason: 'validation-failed',
      issues: [{
        id: 'invalid-xml',
        fieldId: 'document',
        fieldName: 'XML',
        message: '文档 XML 无法解析。',
        severity: 'error',
      }],
    })
  })

  it('posts latest XML to backend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: '1', fileName: 'record.xml', source: 'local', savedAt: '2026-05-16T00:00:00Z' }),
    })))
    const adapter = {
      saveXml: vi.fn(() => ({ ok: true as const, xml: '<XTextDocument />' })),
    }

    await expect(saveDocumentToBackend(adapter, {
      sessionId: '1',
      fileName: 'record.xml',
      source: 'local',
    })).resolves.toEqual({
      ok: true,
      response: { id: '1', fileName: 'record.xml', source: 'local', savedAt: '2026-05-16T00:00:00Z' },
    })
    expect(fetch).toHaveBeenCalledWith('/api/documents/save', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
  })
})
```

- [ ] **Step 5: Implement save service**

Create `frontend/src/services/documentSaveService.ts`:

```ts
import type { DocumentSource, SaveDocumentResponse, ValidationIssue } from '../types/document'
import type { WriterSaveResult } from '../utils/writerControlAdapter'
import { validateDocumentXml } from './documentValidationService'

interface SaveAdapter {
  saveXml: () => WriterSaveResult
}

export interface SaveDocumentOptions {
  sessionId: string
  fileName: string
  source: DocumentSource
}

export type BackendSaveResult =
  | { ok: true; response: SaveDocumentResponse }
  | { ok: false; reason: 'adapter-failed'; message: string }
  | { ok: false; reason: 'validation-failed'; issues: ValidationIssue[] }
  | { ok: false; reason: 'backend-failed'; message: string }

export async function saveDocumentToBackend(adapter: SaveAdapter, options: SaveDocumentOptions): Promise<BackendSaveResult> {
  const saveResult = adapter.saveXml()
  if (!saveResult.ok) {
    return { ok: false, reason: 'adapter-failed', message: saveResult.message }
  }

  const issues = validateDocumentXml(saveResult.xml)
  if (issues.some(issue => issue.severity === 'error')) {
    return { ok: false, reason: 'validation-failed', issues }
  }

  const response = await fetch('/api/documents/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: options.sessionId,
      fileName: options.fileName,
      xml: saveResult.xml,
      source: options.source,
      updatedAt: new Date().toISOString(),
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return {
      ok: false,
      reason: 'backend-failed',
      message: readErrorMessage(payload) || '文档保存失败。',
    }
  }

  return { ok: true, response: payload as SaveDocumentResponse }
}

export function downloadXml(fileName: string, xml: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'document.xml'
  anchor.click()
  URL.revokeObjectURL(url)
}

function readErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: unknown }).message || '')
  }

  return ''
}
```

- [ ] **Step 6: Run save and validation tests**

Run:

```powershell
cd .\frontend
npm test -- documentValidationService.test.ts documentSaveService.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit validation and save services**

```powershell
git add frontend/src/services/documentValidationService.ts frontend/src/services/documentValidationService.test.ts frontend/src/services/documentSaveService.ts frontend/src/services/documentSaveService.test.ts
git commit -m "添加文档校验与保存服务"
```

## Task 5: Document Session State

**Files:**
- Create: `frontend/src/composables/useDocumentSession.ts`
- Create: `frontend/src/composables/useDocumentSession.test.ts`

- [ ] **Step 1: Write failing session tests**

Create `frontend/src/composables/useDocumentSession.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { useDocumentSession } from './useDocumentSession'

describe('useDocumentSession', () => {
  it('loads a template document into a clean session', () => {
    const session = useDocumentSession()

    session.loadTemplate({
      id: 'admission',
      name: 'Admission Record',
      fileName: 'Admission Record.xml',
      category: 'EMRWriterLite',
      xml: '<XTextDocument />',
    })

    expect(session.document.value?.source).toBe('template')
    expect(session.saveState.value).toBe('saved')
    expect(session.isDirty.value).toBe(false)
  })

  it('marks the session dirty after content changes', () => {
    const session = useDocumentSession()

    session.loadLocalDocument({
      id: '1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings: [],
      renderMode: 'canvas',
    })
    session.markDirty()

    expect(session.saveState.value).toBe('dirty')
    expect(session.isDirty.value).toBe(true)
  })

  it('marks the session saved with the latest XML', () => {
    const session = useDocumentSession()

    session.loadLocalDocument({
      id: '1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings: [],
      renderMode: 'canvas',
    })
    session.markSaved('<XTextDocument><A /></XTextDocument>')

    expect(session.saveState.value).toBe('saved')
    expect(session.lastSavedXml.value).toBe('<XTextDocument><A /></XTextDocument>')
  })
})
```

- [ ] **Step 2: Implement session composable**

Create `frontend/src/composables/useDocumentSession.ts`:

```ts
import { computed, readonly, shallowRef } from 'vue'
import type { EditorDocument, ImportedDocument, SaveState, TemplateContent, ValidationIssue } from '../types/document'

export function useDocumentSession() {
  const document = shallowRef<EditorDocument | null>(null)
  const saveState = shallowRef<SaveState>('idle')
  const lastSavedXml = shallowRef('')
  const validationIssues = shallowRef<ValidationIssue[]>([])
  const error = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)
  const isSaving = shallowRef(false)

  const isDirty = computed(() => saveState.value === 'dirty')

  function loadTemplate(template: TemplateContent) {
    document.value = {
      id: template.id,
      fileName: template.fileName,
      xml: template.xml,
      warnings: [],
      source: 'template',
      templateId: template.id,
    }
    lastSavedXml.value = template.xml
    validationIssues.value = []
    error.value = null
    saveState.value = 'saved'
  }

  function loadLocalDocument(imported: ImportedDocument) {
    document.value = {
      id: imported.id,
      fileName: imported.fileName,
      xml: imported.xml,
      warnings: imported.warnings,
      source: 'local',
    }
    lastSavedXml.value = imported.xml
    validationIssues.value = []
    error.value = null
    saveState.value = 'saved'
  }

  function markDirty() {
    if (document.value) {
      saveState.value = 'dirty'
    }
  }

  function markSaving() {
    isSaving.value = true
    saveState.value = 'saving'
  }

  function markSaved(xml: string) {
    isSaving.value = false
    lastSavedXml.value = xml
    saveState.value = 'saved'
  }

  function markFailed(message: string) {
    isSaving.value = false
    error.value = message
    saveState.value = 'failed'
  }

  function setValidationIssues(issues: ValidationIssue[]) {
    validationIssues.value = issues
  }

  function clearDocument() {
    document.value = null
    lastSavedXml.value = ''
    validationIssues.value = []
    error.value = null
    saveState.value = 'idle'
  }

  return {
    document: readonly(document),
    saveState: readonly(saveState),
    lastSavedXml: readonly(lastSavedXml),
    validationIssues: readonly(validationIssues),
    error: readonly(error),
    isLoading: readonly(isLoading),
    isSaving: readonly(isSaving),
    isDirty,
    loadTemplate,
    loadLocalDocument,
    markDirty,
    markSaving,
    markSaved,
    markFailed,
    setValidationIssues,
    clearDocument,
  }
}
```

- [ ] **Step 3: Run session tests**

Run:

```powershell
cd .\frontend
npm test -- useDocumentSession.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit session work**

```powershell
git add frontend/src/composables/useDocumentSession.ts frontend/src/composables/useDocumentSession.test.ts
git commit -m "添加文档会话状态"
```

## Task 6: Ribbon Command Registry

**Files:**
- Create: `frontend/src/components/editor/ribbonCommands.ts`
- Create: `frontend/src/components/editor/ribbonCommands.test.ts`

- [ ] **Step 1: Write failing command registry tests**

Create `frontend/src/components/editor/ribbonCommands.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createWriterCommandPayload, findRibbonCommand, ribbonTabs } from './ribbonCommands'

describe('ribbonCommands', () => {
  it('contains required tabs', () => {
    expect(ribbonTabs.map(tab => tab.id)).toEqual(['file', 'start', 'insert', 'table', 'print'])
  })

  it('maps bold to a DC command', () => {
    expect(createWriterCommandPayload('bold')).toEqual({
      commandName: 'bold',
      showUI: false,
      parameter: true,
      executor: 'dc',
    })
  })

  it('maps split cell to the legacy command executor', () => {
    expect(createWriterCommandPayload('splitCell')).toEqual({
      commandName: 'Table_SplitCellExt',
      showUI: true,
      parameter: null,
      executor: 'legacy',
    })
  })

  it('finds table commands', () => {
    expect(findRibbonCommand('mergeCell')?.label).toBe('合并单元格')
  })
})
```

- [ ] **Step 2: Implement command registry**

Create `frontend/src/components/editor/ribbonCommands.ts`:

```ts
import type { EditorCommandId, WriterCommandPayload } from '../../types/document'

export interface RibbonCommand {
  id: EditorCommandId
  label: string
  icon?: string
  payload: WriterCommandPayload
  requiresWriter?: boolean
}

export interface RibbonGroup {
  id: string
  label: string
  commands: RibbonCommand[]
}

export interface RibbonTab {
  id: string
  label: string
  groups: RibbonGroup[]
}

export const ribbonTabs: RibbonTab[] = [
  {
    id: 'file',
    label: '文件',
    groups: [
      { id: 'save', label: '保存', commands: [] },
    ],
  },
  {
    id: 'start',
    label: '开始',
    groups: [
      {
        id: 'clipboard',
        label: '剪贴板',
        commands: [
          command('undo', '撤销', 'Undo'),
          command('redo', '重做', 'Redo'),
          command('copy', '复制', 'Copy'),
          command('cut', '剪切', 'Cut'),
          command('paste', '粘贴', 'Paste'),
          command('selectAll', '全选', 'selectall'),
        ],
      },
      {
        id: 'format',
        label: '格式',
        commands: [
          command('bold', '加粗', 'bold', true),
          command('italic', '斜体', 'italic', true),
          command('underline', '下划线', 'underline', true),
          command('alignLeft', '左对齐', 'aligntoleft'),
          command('alignCenter', '居中', 'aligntocenter'),
          command('alignRight', '右对齐', 'aligntoright'),
        ],
      },
    ],
  },
  {
    id: 'insert',
    label: '插入',
    groups: [
      {
        id: 'clinical',
        label: '临床控件',
        commands: [
          command('insertInputField', '输入域', 'InsertInputField', null, true),
          command('insertDateTime', '日期时间', 'InsertDatetime', null, true),
          command('insertCheckbox', '勾选框', 'InsertCheckBoxOrRadio', { type: 'checkbox' }, false),
          command('insertRadio', '单选框', 'InsertCheckBoxOrRadio', { type: 'radio' }, false),
          command('insertPageBreak', '分页符', 'insertpagebreak', null, true),
          command('insertPageInfo', '页码', 'InsertPageInfoElement', null, false),
        ],
      },
    ],
  },
  {
    id: 'table',
    label: '表格',
    groups: [
      {
        id: 'table-edit',
        label: '表格编辑',
        commands: [
          command('insertTable', '插入表格', 'InsertTable', null, true),
          command('deleteTable', '删除表格', 'Table_DeleteTable'),
          command('insertRowUp', '上方插入行', 'Table_InsertRowUp'),
          command('insertRowDown', '下方插入行', 'Table_InsertRowDown'),
          command('insertColumnLeft', '左侧插入列', 'Table_InsertColumnLeft'),
          command('insertColumnRight', '右侧插入列', 'Table_InsertColumnRight'),
          command('mergeCell', '合并单元格', 'Table_MergeCell'),
          legacyCommand('splitCell', '拆分单元格', 'Table_SplitCellExt', null, true),
          command('tableProperties', '表格属性', 'tableproperties', null, true),
          command('rowProperties', '行属性', 'tablerowproperties', null, true),
          command('cellProperties', '单元格属性', 'tablecellproperties', null, true),
        ],
      },
    ],
  },
  {
    id: 'print',
    label: '打印',
    groups: [
      { id: 'print-actions', label: '打印', commands: [] },
    ],
  },
]

export function findRibbonCommand(id: EditorCommandId) {
  for (const tab of ribbonTabs) {
    for (const group of tab.groups) {
      const found = group.commands.find(command => command.id === id)
      if (found) return found
    }
  }

  return null
}

export function createWriterCommandPayload(id: EditorCommandId): WriterCommandPayload | null {
  return findRibbonCommand(id)?.payload || null
}

function command(
  id: EditorCommandId,
  label: string,
  commandName: string,
  parameter: unknown = null,
  showUI = false,
): RibbonCommand {
  return {
    id,
    label,
    payload: {
      commandName,
      showUI,
      parameter,
      executor: 'dc',
    },
    requiresWriter: true,
  }
}

function legacyCommand(
  id: EditorCommandId,
  label: string,
  commandName: string,
  parameter: unknown = null,
  showUI = false,
): RibbonCommand {
  return {
    id,
    label,
    payload: {
      commandName,
      showUI,
      parameter,
      executor: 'legacy',
    },
    requiresWriter: true,
  }
}
```

- [ ] **Step 3: Run command registry tests**

Run:

```powershell
cd .\frontend
npm test -- ribbonCommands.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit command registry**

```powershell
git add frontend/src/components/editor/ribbonCommands.ts frontend/src/components/editor/ribbonCommands.test.ts
git commit -m "添加编辑器命令注册表"
```

## Task 7: Editor Shell Components

**Files:**
- Create: `frontend/src/components/editor/TemplatePanel.vue`
- Create: `frontend/src/components/editor/EditorStatusBar.vue`
- Create: `frontend/src/components/editor/ValidationPanel.vue`
- Modify: `frontend/src/components/editor/EditorShell.vue`
- Modify: `frontend/src/components/editor/ImportToolbar.vue`

- [ ] **Step 1: Create TemplatePanel**

Create `frontend/src/components/editor/TemplatePanel.vue`:

```vue
<script setup lang="ts">
import { FileUp } from 'lucide-vue-next'
import type { TemplateSummary } from '../../types/document'

interface Props {
  templates: TemplateSummary[]
  selectedTemplateId?: string
  isLoading?: boolean
  error?: string | null
}

interface Emits {
  selectTemplate: [id: string]
  importFile: [file: File]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('importFile', file)
    input.value = ''
  }
}
</script>

<template>
  <aside class="template-panel" aria-label="模板列表">
    <div class="template-panel__header">
      <strong>模板</strong>
      <label class="template-panel__import" title="导入本地 XML">
        <FileUp :size="16" />
        <input type="file" accept=".xml,text/xml,application/xml" @change="handleFileChange">
      </label>
    </div>

    <p v-if="props.error" class="template-panel__error">{{ props.error }}</p>
    <p v-else-if="props.isLoading" class="template-panel__muted">模板加载中...</p>

    <button
      v-for="template in props.templates"
      :key="template.id"
      class="template-panel__item"
      :class="{ 'template-panel__item--active': template.id === props.selectedTemplateId }"
      type="button"
      @click="emit('selectTemplate', template.id)"
    >
      <span>{{ template.name }}</span>
      <small>{{ template.category }}</small>
    </button>
  </aside>
</template>
```

- [ ] **Step 2: Create EditorStatusBar**

Create `frontend/src/components/editor/EditorStatusBar.vue`:

```vue
<script setup lang="ts">
import type { SaveState } from '../../types/document'

interface Props {
  fileName?: string
  saveState: SaveState
  renderMode: string
  zoom: number
  validationCount: number
  isPrintPreviewing: boolean
}

const props = defineProps<Props>()

const saveStateText: Record<SaveState, string> = {
  idle: '未打开文档',
  dirty: '未保存',
  saving: '保存中',
  saved: '已保存',
  failed: '保存失败',
}
</script>

<template>
  <footer class="status-bar">
    <span>{{ props.fileName || '未打开文档' }}</span>
    <span>{{ saveStateText[props.saveState] }}</span>
    <span>渲染：{{ props.renderMode }}</span>
    <span>校验：{{ props.validationCount }} 项</span>
    <span>{{ props.isPrintPreviewing ? '打印预览中' : '编辑模式' }}</span>
    <span class="status-bar__right">缩放：{{ Math.round(props.zoom * 100) }}%</span>
  </footer>
</template>
```

- [ ] **Step 3: Create ValidationPanel**

Create `frontend/src/components/editor/ValidationPanel.vue`:

```vue
<script setup lang="ts">
import type { ValidationIssue } from '../../types/document'

interface Props {
  issues: ValidationIssue[]
}

interface Emits {
  selectIssue: [issue: ValidationIssue]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <section v-if="props.issues.length > 0" class="validation-panel" aria-label="校验问题">
    <strong>保存前校验</strong>
    <button
      v-for="issue in props.issues"
      :key="issue.id"
      class="validation-panel__issue"
      type="button"
      @click="emit('selectIssue', issue)"
    >
      {{ issue.message }}
    </button>
  </section>
</template>
```

- [ ] **Step 4: Wire components into EditorShell**

Modify `frontend/src/components/editor/EditorShell.vue`:

- Replace direct `useDocumentImport()` document ownership with `useDocumentSession()`.
- Keep local import by calling `importFile(file)` and then `session.loadLocalDocument(importedDocument)`.
- Load templates on mount with `fetchTemplates()`.
- On template click, call `fetchTemplateContent(id)`, `session.loadTemplate(template)`, then let `CanvasPreview` load the new document.
- Create adapter with `createWriterControlAdapter(writerElement.value)`.
- Route toolbar commands through `createWriterCommandPayload(commandId)` and `adapter.executeCommand(payload)`.
- On successful command execution, call `session.markDirty()`.
- Use `saveDocumentToBackend(adapter, ...)` for backend save.
- Use `adapter.saveXml()` + `downloadXml(...)` for local download.

Keep these component contracts:

```ts
function handleTemplateSelect(id: string): Promise<void>
function handleLocalImport(file: File): Promise<void>
function runEditorCommand(commandId: EditorCommandId): void
function saveToBackend(): Promise<void>
function downloadCurrentXml(): void
function handleValidationIssue(issue: ValidationIssue): void
```

- [ ] **Step 5: Update ImportToolbar events**

Modify `frontend/src/components/editor/ImportToolbar.vue`:

- Add emits for `runCommand`, `save`, and `downloadXml`.
- Continue emitting `print`, `printPreview`, and `closePrintPreview`.
- Render command buttons from `ribbonTabs` for start/insert/table groups.
- Disable command buttons when no writer element is available.

The emits contract should include:

```ts
interface Emits {
  importFile: [file: File]
  selectTab: [tabId: string]
  print: []
  printPreview: []
  closePrintPreview: []
  runCommand: [commandId: EditorCommandId]
  save: []
  downloadXml: []
}
```

- [ ] **Step 6: Run frontend build**

Run:

```powershell
cd .\frontend
npm run build
```

Expected: build exits with code 0.

- [ ] **Step 7: Commit editor shell components**

```powershell
git add frontend/src/components/editor/TemplatePanel.vue frontend/src/components/editor/EditorStatusBar.vue frontend/src/components/editor/ValidationPanel.vue frontend/src/components/editor/EditorShell.vue frontend/src/components/editor/ImportToolbar.vue
git commit -m "搭建编辑器壳层界面"
```

## Task 8: Runtime Integration And Verification

**Files:**
- Modify as needed based on runtime issues found in Task 7.

- [ ] **Step 1: Run all frontend tests**

Run:

```powershell
cd .\frontend
npm test
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
cd .\frontend
npm run build
```

Expected: build exits with code 0.

- [ ] **Step 3: Run backend build**

Run:

```powershell
dotnet build .\backend\backend.csproj
```

Expected: build exits with code 0.

- [ ] **Step 4: Start backend**

Run:

```powershell
cd .\backend
dotnet run
```

Expected: backend listens on its configured local port, typically `http://localhost:5190`.

- [ ] **Step 5: Start frontend**

Run in another terminal:

```powershell
cd .\frontend
npm run dev
```

Expected: Vite starts and may auto-select an available local port.

- [ ] **Step 6: Verify browser workflows with Playwright**

Open the Vite URL and verify:

- Template list loads from `/api/templates`.
- Selecting a template loads the XML into WriterControl.
- Local XML import still works.
- A simple format command marks the document dirty.
- Download XML returns latest editor XML.
- Backend save calls `/api/documents/save` and marks state saved.
- Required-field validation blocks save when validation issues exist.
- Print preview, close preview, and print actions still call existing WriterControl print APIs.

- [ ] **Step 7: Commit runtime fixes**

If runtime integration required additional changes, stage only the files shown by `git status --short` that were intentionally modified for the runtime fix, then commit them:

```powershell
git status --short
git add frontend/src/components/editor/EditorShell.vue frontend/src/components/editor/ImportToolbar.vue
git commit -m "完善编辑器运行时集成"
```

If the actual runtime fix touches different files, replace the two `git add` paths with those exact intentional files. If no additional changes were required, do not create an empty commit.

## Task 9: Final Closeout

**Files:**
- Modify: `README.md` only if startup or feature usage docs need updating.

- [ ] **Step 1: Update README only if behavior changed for users**

If the implementation adds new startup, template, save, or validation usage that is not obvious from the UI, add a short section to `README.md`:

```markdown
## EMR Web Editor MVP

- 左侧模板列表可加载 EMRWriterLite 示例文档。
- 顶部 Ribbon 提供常用编辑、插入、表格和打印命令。
- 保存支持本地 XML 下载和后端 demo 保存接口。
- 保存前会执行基础必填项校验。
```

- [ ] **Step 2: Run final verification**

Run:

```powershell
cd .\frontend
npm test
npm run build
cd ..
dotnet build .\backend\backend.csproj
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Check git state**

Run:

```powershell
git status --short
git log --oneline -5
```

Expected: only intentional tracked changes remain, and each completed task has a focused commit.

## Self-Review Checklist

- Spec coverage:
  - Template list and local import: Tasks 1, 3, 7, 8.
  - WriterControl adapter: Task 2.
  - Command registry and toolbar: Tasks 6, 7.
  - Document session and dirty state: Task 5 and Task 7.
  - Local XML download and backend save: Tasks 1, 4, 7.
  - Basic required-field validation: Task 4 and Task 7.
  - Print preview and print preservation: Tasks 2, 7, 8.
  - Runtime verification: Task 8 and Task 9.
- No placeholders: every task names exact files, commands, expected outcomes, and concrete code or contracts.
- Type consistency: `EditorCommandId`, `WriterCommandPayload`, `ValidationIssue`, `TemplateSummary`, `TemplateContent`, and save response types are defined before later tasks use them.
- Scope control: permissions, traces, PDF export, advanced print, recent files, AI, and full EMRWriterLite cloning remain out of v1.
