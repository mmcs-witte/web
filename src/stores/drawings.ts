import { defineStore } from "pinia";
import { ref } from 'vue';
import { DrawingType } from "@/types/drawings";

export const useDrawingsStore = defineStore("drawings", () => {
  const currentDrawing = ref('')
  function draw(name: DrawingType) {
    currentDrawing.value = name
  }

  return { currentDrawing, draw }
})


