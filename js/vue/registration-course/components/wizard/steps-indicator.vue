<template>
  <div class="steps-indicator" :class="{ 'steps-indicator--expanded': expanded, 'steps-indicator--disabled': disabled }">
    <!-- Свёрнутый вид: текущий шаг и тонкая шкала прогресса. На десктопе
         скрыт — там сразу виден весь список шагов. -->
    <button type="button" class="steps-indicator__current" :aria-expanded="expanded" :disabled="disabled" @click="expanded = !expanded">
      <span class="steps-indicator__counter">Шаг {{ current + 1 }} из {{ steps.length }}</span>
      <span class="steps-indicator__current-title">{{ currentTitle }}</span>
      <span class="steps-indicator__chevron" :class="{ 'steps-indicator__chevron--up': expanded }"></span>
    </button>
    <div class="steps-indicator__progress">
      <div class="steps-indicator__progress-bar" :style="{ width: progressWidth }"></div>
    </div>

    <ol class="steps-indicator__list">
      <li v-for="(step, index) in steps" :key="step.title" :class="itemClass(index)">
        <button
            type="button"
            class="steps-indicator__item"
            :disabled="disabled || !isReachable(index)"
            :aria-current="index === current ? 'step' : null"
            @click="goTo(index)">
          <span class="steps-indicator__number">{{ index + 1 }}</span>
          <span class="steps-indicator__title">{{ step.title }}</span>
        </button>
      </li>
    </ol>
  </div>
</template>

<script>
// Индикатор шагов визарда. Показывает, где человек находится и сколько ещё
// заполнять. Подсветка и кликабельность строятся на текущей валидности шагов,
// а не на истории посещений: «зелёный» = «заполнен правильно прямо сейчас»,
// а перейти кликом можно до любого шага, перед которым вся цепочка предыдущих
// шагов валидна (валидацию это не обходит — всё перед ним уже проверено).
export default {
  name: 'steps-indicator',
  props: {
    // [{ title: 'Контакты', ... }]
    steps: {type: Array, required: true},
    current: {type: Number, required: true},
    // Текущая валидность каждого шага (true/false), по индексам — как steps.
    validity: {type: Array, required: true},
    // Пока идёт отправка заявки, шкала визуально притушена и не кликабельна —
    // как кнопка «Назад» в футере визарда.
    disabled: {type: Boolean, default: false},
  },
  data() {
    return {expanded: false};
  },
  computed: {
    currentTitle() {
      return this.steps[this.current]?.title || '';
    },
    progressWidth() {
      if (!this.steps.length) return '0%';
      return `${((this.current + 1) / this.steps.length) * 100}%`;
    },
  },
  methods: {
    // До шага можно перейти кликом, только если все шаги перед ним валидны.
    isReachable(index) {
      return index < this.steps.length && this.validity.slice(0, index).every(Boolean);
    },
    itemClass(index) {
      return {
        'steps-indicator__step--current': index === this.current,
        // Зелёный — валидный (заполненный) шаг, независимо от того, до текущего
        // он или после. Стёртые обязательные поля сразу убирают подсветку.
        // Пассивный шаг (обзор перед отправкой) заполнять не нужно — он всегда
        // валиден для цепочки, но зелёным не красится, чтобы не выглядеть
        // «уже пройденным» с самого начала.
        'steps-indicator__step--reached': index !== this.current && Boolean(this.validity[index]) && !this.steps[index]?.passive,
        'steps-indicator__step--unreachable': !this.isReachable(index),
      };
    },
    goTo(index) {
      if (this.disabled) return;
      if (!this.isReachable(index) || index === this.current) return;
      this.expanded = false;
      this.$emit('go-to', index);
    },
  },
};
</script>

<style scoped>
/* Текущий шаг подсвечен, пройденные — обычные и кликабельные,
   будущие — «выгоревшие» и некликабельные. */
.steps-indicator {
  margin-bottom: 20px;
  font-size: 14px;
}

/* Свёрнутый вид (мобильный): одна строка + шкала */
.steps-indicator__current {
  display: none;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px 4px 0 0;
  background: #f7f7f7;
  cursor: pointer;
  text-align: left;
  align-items: center;
  gap: 8px;
}
.steps-indicator__counter {
  color: #999;
  white-space: nowrap;
}
.steps-indicator__current-title {
  font-weight: bold;
  color: #337ab7;
  flex: 1;
}
.steps-indicator__chevron {
  width: 8px;
  height: 8px;
  border-right: 2px solid #999;
  border-bottom: 2px solid #999;
  transform: rotate(45deg);
  transition: transform 0.2s;
}
.steps-indicator__chevron--up {
  transform: rotate(225deg);
}
.steps-indicator__progress {
  display: none;
  height: 4px;
  background: #e5e5e5;
}
.steps-indicator__progress-bar {
  height: 100%;
  background: #337ab7;
  transition: width 0.3s;
}

/* Развёрнутый список шагов (десктоп — всегда виден) */
.steps-indicator__list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps-indicator__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  color: #333;
}
.steps-indicator__item:disabled {
  cursor: default;
}
.steps-indicator__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #ccc;
  font-size: 12px;
  flex-shrink: 0;
}
/* Текущий шаг — подсвечен синим */
.steps-indicator__step--current .steps-indicator__item {
  border-color: #337ab7;
  background: #eaf2f9;
  color: #337ab7;
  font-weight: bold;
}
.steps-indicator__step--current .steps-indicator__number {
  background: #337ab7;
  border-color: #337ab7;
  color: #fff;
}
/* Достигнутые (заполненные) шаги — зелёные и кликабельные, где бы они ни
   находились относительно текущего */
.steps-indicator__step--reached .steps-indicator__item {
  color: #3c763d;
}
.steps-indicator__step--reached .steps-indicator__number {
  background: #5cb85c;
  border-color: #5cb85c;
  color: #fff;
}
.steps-indicator__step--reached .steps-indicator__item:hover {
  background: #eaf5ea;
  border-color: #5cb85c;
}
/* Недоступные (ещё не заполненные) — выгоревшие */
.steps-indicator__step--unreachable .steps-indicator__item {
  color: #bbb;
}
.steps-indicator__step--unreachable .steps-indicator__number {
  border-color: #ddd;
  color: #bbb;
}
/* Во время отправки заявки вся шкала притушена */
.steps-indicator--disabled {
  opacity: 0.6;
}

@media (max-width: 768px) {
  /* На узком экране показываем свёрнутый вид; список — по раскрытию */
  .steps-indicator__current {
    display: flex;
  }
  .steps-indicator__progress {
    display: block;
  }
  .steps-indicator__list {
    display: none;
    flex-direction: column;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 4px 4px;
    background: #fff;
  }
  .steps-indicator--expanded .steps-indicator__list {
    display: flex;
  }
  .steps-indicator--expanded .steps-indicator__current {
    border-radius: 4px 4px 0 0;
  }
}
</style>
