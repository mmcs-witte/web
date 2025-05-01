import { defineStore } from "pinia";
import { ref } from 'vue';

export const useIndicatorsStore = defineStore("indicators", () => {
  const addedIndicator = ref(null)

  return { addedIndicator }
})
