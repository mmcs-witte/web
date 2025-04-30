<script setup lang="ts">
import { useDrawingsStore } from '../stores/drawings';
import { DrawingType } from '../types/drawings';


const drawingStore = useDrawingsStore()
const selectDrawing = (drawingType: DrawingType) => {
  drawingStore.currentDrawing = drawingType
}
</script>

<template>
<aside class="flex-none basis-16 flex flex-col h-full items-center justify-between rounded-md bg-gray-800 py-2">
  <nav class="flex flex-col w-full space-y-2 px-1">
    <button 
      class="hover:bg-gray-700 aspect-square focus:outline-hidden active::outline-hidden rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.Arrow)"
    >
      <FontAwesomeIcon :icon="['fa', 'arrow-pointer']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.Rectangle)"
    >
      <FontAwesomeIcon :icon="['fas', 'palette']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.Triangle)"  
    >
      <FontAwesomeIcon :icon="['fas', 'ruler']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.FibonacciChannel)"  
    >
      <FontAwesomeIcon :icon="['fas', 'cat']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.FibonacciSpiral)"  
    >
      <FontAwesomeIcon :icon="['fas', 'cat']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.Curve)"  
    >
      <FontAwesomeIcon :icon="['fas', 'cat']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      @click="selectDrawing(DrawingType.TrendLine)"  
    >
      <FontAwesomeIcon :icon="['fas', 'cat']" size="2x" />
    </button>
  </nav>
  <div class="text-sm text-gray-200">
    <span class="p-2">v0.2.0</span>
  </div>
</aside>
</template>

<style scoped>

</style>
