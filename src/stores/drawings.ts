import { defineStore } from "pinia";
import { ref } from 'vue';

import { DrawingType } from "../types/drawings";

export const useDrawingsStore = defineStore("drawings", () => {
  const currentDrawing = ref(DrawingType.TrendLine)

  function resetCurrentDrawing() {
    currentDrawing.value = DrawingType.TrendLine
  }

  return { currentDrawing, resetCurrentDrawing }
})


