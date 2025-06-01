<script setup lang="ts">
import { useDrawingsStore } from '../stores/drawings';
import { DrawingType } from '../types/drawings';


const drawingStore = useDrawingsStore()
const selectDrawing = (drawingType: DrawingType) => {
  drawingStore.currentDrawing = drawingType;
  //drawingStore.resetCurrentDrawing();
}
</script>

<template>
<aside class="flex-none basis-16 flex flex-col h-full items-center justify-between rounded-md bg-gray-800 py-2">
  <nav class="flex flex-col w-full space-y-2 px-1">
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Trend line"
      @click="selectDrawing(DrawingType.TrendLine)"  
    >
      <FontAwesomeIcon :icon="['fas', 'person']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Time Line"
      @click="selectDrawing(DrawingType.TimeLine)"  
    >
      <FontAwesomeIcon :icon="['fas', 'burn']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Rectangle"
      @click="selectDrawing(DrawingType.Rectangle)"
    >
      <FontAwesomeIcon :icon="['fas', 'palette']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Triangle"
      @click="selectDrawing(DrawingType.Triangle)"  
    >
      <FontAwesomeIcon :icon="['fas', 'ruler']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Fibonacci Channel"
      @click="selectDrawing(DrawingType.FibonacciChannel)"  
    >
      <FontAwesomeIcon :icon="['fas', 'terminal']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Fibonacci Wedge"
      @click="selectDrawing(DrawingType.FibonacciWedge)"  
    >
      <FontAwesomeIcon :icon="['fas', 'male']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Fibonacci Spiral"
      @click="selectDrawing(DrawingType.FibonacciSpiral)"  
    >
      <FontAwesomeIcon :icon="['fas', 'cog']" size="2x" />
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Curve"
      @click="selectDrawing(DrawingType.Curve)"  
    >
      <FontAwesomeIcon :icon="['fas', 'home']" size="2x" />
    </button>
        <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Polyline"
      @click="selectDrawing(DrawingType.Polyline)"  
    >
      <FontAwesomeIcon :icon="['fas', 'cog']" size="2x" />
    </button>
  </nav>
  <div class="text-sm text-gray-200">
    <span class="p-2">v1.2.0</span>
  </div>
</aside>
</template>

<style scoped>

</style>
