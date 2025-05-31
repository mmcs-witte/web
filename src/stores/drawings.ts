import { defineStore } from "pinia";
import { ref } from 'vue';

import { DrawingType } from "../types/drawings";

export const useDrawingsStore = defineStore("drawings", () => {
  const currentDrawing = ref(DrawingType.None)

  function resetCurrentDrawing() {
    currentDrawing.value = DrawingType.None
  }

  return { currentDrawing, resetCurrentDrawing }
})


