import { defineStore } from "pinia";
import { ref } from 'vue';

export interface Indicator {
  id: number
  name: string
  type: string
  unavailable?: boolean
}

export const useIndicatorsStore = defineStore("indicators", () => {
  const addedIndicator = ref<Indicator | null>(null)

  return { addedIndicator }
})
