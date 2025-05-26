<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue'
import { useIndicatorsStore } from '../stores/indicators'
import { IndicatorType } from '../types/indicators'

const indicatorsStore = useIndicatorsStore()

type indicatorItem = {
  id: number,
  name: string,
  type: IndicatorType,
  unavailable: boolean
}

const indicatorsList: indicatorItem[] = [
  { id: 1, name: 'Simple Moving Average', type: IndicatorType.Sma, unavailable: false },
  { id: 2, name: 'Bollinger Bands', type: IndicatorType.BollingerBands, unavailable: false },
]

const selectedIndicator = ref(null)

watch(selectedIndicator, (newVal) => {
  if (newVal == null) return

  indicatorsStore.addedIndicator = newVal.type
})
</script>

<template>
  <div class="relative inline-block text-left">
    <Listbox v-model="selectedIndicator">
      <ListboxButton>Indicators</ListboxButton>
      <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
      <ListboxOptions
        class="absolute z-10 py-1 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-hidden"
      >
        <ListboxOption
          class="text-black dark:text-white block px-4 py-2 text-sm hover:bg-gray-700 hover:text-gray-50 has-disabled:dark:text-red-500"
          v-for="indicator in indicatorsList"
          :key="indicator.id"
          :value="indicator"
          :disabled="indicator.unavailable"
        >
          {{ indicator.name }}
        </ListboxOption>
      </ListboxOptions>
    </transition>
    </Listbox>
  </div>
</template>

<style scoped>

</style>
