import { defineStore } from "pinia";
import { ref } from 'vue';
import { DrawingType } from "@/types/drawings";

export const useDrawingsStore = defineStore("drawings", () => {
  const currentDrawing = ref(DrawingType.Arrow)

  function resetCurrentDrawing() {
    currentDrawing.value = DrawingType.Arrow
  }

  return { currentDrawing, resetCurrentDrawing }
})


