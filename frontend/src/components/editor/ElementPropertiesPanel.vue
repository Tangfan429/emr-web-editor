<script setup lang="ts">
import type {
  EditorElementProperties,
  EditorElementType,
  ElementPropertyUpdateResult,
} from '../../types/editorElement'

interface Props {
  element: EditorElementProperties
  status: ElementPropertyUpdateResult
}

interface Emits {
  refresh: []
  selectType: [type: EditorElementType]
  update: [patch: Partial<EditorElementProperties>]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const typeOptions: Array<{ type: EditorElementType; label: string }> = [
  { type: 'input-field', label: '输入域' },
  { type: 'radio', label: '单选框' },
  { type: 'checkbox', label: '复选框' },
  { type: 'table', label: '表格' },
  { type: 'table-row', label: '表格行' },
  { type: 'table-cell', label: '单元格' },
  { type: 'barcode', label: '条码' },
  { type: 'qrcode', label: '二维码' },
]

function updateText(name: keyof EditorElementProperties, event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update', { [name]: value })
}

function updateNumber(name: keyof EditorElementProperties, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update', { [name]: Number.isNaN(value) ? undefined : value })
}

function updateBoolean(name: keyof EditorElementProperties, event: Event) {
  emit('update', { [name]: (event.target as HTMLInputElement).checked })
}
</script>

<template>
  <section class="element-properties" aria-label="元素属性">
    <div class="element-properties__types" aria-label="元素类型">
      <button
        v-for="option in typeOptions"
        :key="option.type"
        class="element-properties__type"
        :class="{ 'element-properties__type--active': props.element.type === option.type }"
        type="button"
        @click="emit('selectType', option.type)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="element-properties__status" :class="`element-properties__status--${props.status.status}`">
      {{ props.status.message }}
    </div>

    <button class="element-properties__refresh" type="button" @click="emit('refresh')">
      读取当前选中元素
    </button>

    <form class="element-properties__form" @submit.prevent>
      <label class="element-properties__field">
        <span>控件类型</span>
        <input :value="props.element.name" @input="updateText('name', $event)" />
      </label>

      <template v-if="props.element.type === 'input-field'">
        <label class="element-properties__field">
          <span>编码</span>
          <input :value="props.element.code" @input="updateText('code', $event)" />
        </label>
        <label class="element-properties__field">
          <span>默认值</span>
          <input :value="props.element.defaultValue" @input="updateText('defaultValue', $event)" />
        </label>
        <label class="element-properties__field">
          <span>数据元绑定</span>
          <input :value="props.element.bindingPath" @input="updateText('bindingPath', $event)" />
        </label>
        <div class="element-properties__checks">
          <label><input type="checkbox" :checked="props.element.readonly" @change="updateBoolean('readonly', $event)" /> 只读</label>
          <label><input type="checkbox" :checked="props.element.required" @change="updateBoolean('required', $event)" /> 必填</label>
          <label><input type="checkbox" :checked="props.element.visible !== false" @change="updateBoolean('visible', $event)" /> 可见</label>
        </div>
      </template>

      <template v-else-if="props.element.type === 'radio' || props.element.type === 'checkbox'">
        <label class="element-properties__field">
          <span>显示文本</span>
          <input :value="props.element.displayText" @input="updateText('displayText', $event)" />
        </label>
        <label class="element-properties__field">
          <span>绑定值</span>
          <input :value="props.element.bindingValue" @input="updateText('bindingValue', $event)" />
        </label>
        <label class="element-properties__checkbox">
          <input type="checkbox" :checked="props.element.defaultChecked" @change="updateBoolean('defaultChecked', $event)" />
          默认选中
        </label>
        <div class="element-properties__option-list">
          <strong>候选项</strong>
          <span v-for="option in props.element.options || []" :key="option.id">
            {{ option.text }} = {{ option.value }}
          </span>
        </div>
      </template>

      <template v-else-if="props.element.type === 'table'">
        <label class="element-properties__field">
          <span>表格 ID</span>
          <input :value="props.element.tableId" @input="updateText('tableId', $event)" />
        </label>
        <label class="element-properties__field">
          <span>行数</span>
          <input type="number" min="1" :value="props.element.rowCount" @input="updateNumber('rowCount', $event)" />
        </label>
        <label class="element-properties__field">
          <span>列数</span>
          <input type="number" min="1" :value="props.element.columnCount" @input="updateNumber('columnCount', $event)" />
        </label>
      </template>

      <template v-else-if="props.element.type === 'table-row'">
        <label class="element-properties__field">
          <span>表格 ID</span>
          <input :value="props.element.tableId" @input="updateText('tableId', $event)" />
        </label>
        <label class="element-properties__field">
          <span>行序号</span>
          <input type="number" min="1" :value="props.element.rowIndex" @input="updateNumber('rowIndex', $event)" />
        </label>
        <label class="element-properties__field">
          <span>行高</span>
          <input type="number" min="0" :value="props.element.height" @input="updateNumber('height', $event)" />
        </label>
      </template>

      <template v-else-if="props.element.type === 'table-cell'">
        <label class="element-properties__field">
          <span>单元格</span>
          <input :value="props.element.cellPosition" @input="updateText('cellPosition', $event)" />
        </label>
        <label class="element-properties__field">
          <span>宽度</span>
          <input type="number" min="0" :value="props.element.width" @input="updateNumber('width', $event)" />
        </label>
        <label class="element-properties__field">
          <span>高度</span>
          <input type="number" min="0" :value="props.element.height" @input="updateNumber('height', $event)" />
        </label>
      </template>

      <template v-else-if="props.element.type === 'barcode' || props.element.type === 'qrcode'">
        <label class="element-properties__field">
          <span>编码内容</span>
          <input :value="props.element.codeContent" @input="updateText('codeContent', $event)" />
        </label>
        <label class="element-properties__field">
          <span>绑定字段</span>
          <input :value="props.element.bindingPath" @input="updateText('bindingPath', $event)" />
        </label>
        <label class="element-properties__field">
          <span>宽度</span>
          <input type="number" min="1" :value="props.element.width" @input="updateNumber('width', $event)" />
        </label>
        <label class="element-properties__field">
          <span>高度</span>
          <input type="number" min="1" :value="props.element.height" @input="updateNumber('height', $event)" />
        </label>
        <label class="element-properties__checkbox">
          <input type="checkbox" :checked="props.element.showText" @change="updateBoolean('showText', $event)" />
          显示文本
        </label>
      </template>
    </form>
  </section>
</template>

<style scoped>
.element-properties {
  display: grid;
  min-height: 0;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 8px;
  overflow: auto;
  padding: 9px;
}

.element-properties__types {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.element-properties__type,
.element-properties__refresh {
  min-height: 28px;
  border: 1px solid #c5d0db;
  border-radius: 4px;
  background: #fff;
  color: #40566d;
  font-size: 12px;
}

.element-properties__type--active {
  border-color: #7ca6c0;
  background: #e8f4fa;
  color: #1f4f73;
  font-weight: 700;
}

.element-properties__status {
  padding: 7px;
  border: 1px solid #d7e0e8;
  border-radius: 4px;
  background: #f7fafc;
  color: #4b5f73;
  font-size: 12px;
  line-height: 17px;
}

.element-properties__status--success {
  border-color: #9ac3a7;
  background: #eff8f1;
  color: #276738;
}

.element-properties__status--unsupported,
.element-properties__status--no-selection {
  border-color: #d7c27a;
  background: #fff8e3;
  color: #765d12;
}

.element-properties__status--failed {
  border-color: #dca1a1;
  background: #fff0f0;
  color: #9b1c1c;
}

.element-properties__refresh {
  width: 100%;
  color: #1f4f73;
}

.element-properties__form {
  display: grid;
  gap: 8px;
}

.element-properties__field {
  display: grid;
  gap: 4px;
  font-size: 12px;
}

.element-properties__field span,
.element-properties__option-list strong {
  color: #607084;
}

.element-properties__field input {
  min-width: 0;
  height: 28px;
  padding: 0 7px;
  border: 1px solid #c8d3de;
  border-radius: 4px;
  background: #fff;
  color: #26364a;
}

.element-properties__checks,
.element-properties__option-list {
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.element-properties__checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.element-properties__option-list {
  padding: 8px;
  border: 1px solid #d9e2ea;
  border-radius: 4px;
  background: #fff;
}

.element-properties__option-list span {
  color: #26364a;
}
</style>
