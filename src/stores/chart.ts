import { defineStore } from "pinia";
import { ref } from "vue";

export const useChartStore  = defineStore("chart", () => {
  const currentType = ref("area");

  return { currentType }
})
