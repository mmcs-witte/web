<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue'
import { useChartStore } from '@/stores/chart'

const chartStore = useChartStore()

const chartTypes = [
  { id: 1, name: 'Baseline', unavailable: false },
  { id: 2, name: 'Histogram', unavailable: false },
  { id: 3, name: 'Candlestick', unavailable: true },
  { id: 4, name: 'Bar', unavailable: true },
  { id: 5, name: 'Area', unavailable: false },
  { id: 6, name: 'Line', unavailable: false }
]
const selectedChartType = ref(chartTypes.filter((chartType) => chartType.name.toLowerCase() == chartStore.currentType)[0])

watch(selectedChartType, (newVal) => {
  chartStore.currentType = newVal.name.toLowerCase()
})
</script>

<template>
  <header class="bg-gray-800 flex flex-row basis-12 items-center rounded-md justify-start space-x-4 p-2">
    <span>Witte</span>
    <div class="relative inline-block text-left">
      <Listbox v-model="selectedChartType">
        <ListboxButton>{{ selectedChartType.name }}</ListboxButton>
        <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
        <ListboxOptions
          class="absolute z-10 py-1 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-hidden"
        >
          <ListboxOption
            class="text-black dark:text-white block px-4 py-2 text-sm hover:bg-gray-700 hover:text-gray-50 has-disabled:dark:text-red-500"
            v-for="chartType in chartTypes"
            :key="chartType.id"
            :value="chartType"
            :disabled="chartType.unavailable"
          >
            {{ chartType.name }}
          </ListboxOption>
        </ListboxOptions>
      </transition>
      </Listbox>
    </div>
  </header>
</template>

<style scoped>

</style>
