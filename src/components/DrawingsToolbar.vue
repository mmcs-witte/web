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
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M7.354 21.354l14-14-.707-.707-14 14z"></path><path d="M22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Time Line"
      @click="selectDrawing(DrawingType.TimeLine)"  
    >
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M15 12.5v-8.5h-1v8.5zM14 16.5v8.5h1v-8.5z"></path><path d="M14.5 16c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Rectangle"
      @click="selectDrawing(DrawingType.Rectangle)"
    >
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M7.5 6h13v-1h-13z" id="Line"></path><path d="M7.5 23h13v-1h-13z"></path><path d="M5 7.5v13h1v-13z"></path><path d="M22 7.5v13h1v-13z"></path><path d="M5.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Triangle"
      @click="selectDrawing(DrawingType.Triangle)"  
    >
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M8.5 23h11v-1h-11zM6 8.5v12h1v-12zM7.483 8.28l12.293 13.112.73-.684-12.293-13.112z"></path><path d="M6.5 8c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM6.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM21.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Fibonacci Channel"
      @click="selectDrawing(DrawingType.FibonacciChannel)"  
    >
        <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M4.5 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2 6.5A2.5 2.5 0 0 1 6.95 6H24v1H6.95A2.5 2.5 0 0 1 2 6.5zM4.5 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2 16.5a2.5 2.5 0 0 1 4.95-.5h13.1a2.5 2.5 0 1 1 0 1H6.95A2.5 2.5 0 0 1 2 16.5zM22.5 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-18 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2 22.5a2.5 2.5 0 0 1 4.95-.5H24v1H6.95A2.5 2.5 0 0 1 2 22.5z"></path><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M22.4 8.94l-1.39.63-.41-.91 1.39-.63.41.91zm-4 1.8l-1.39.63-.41-.91 1.39-.63.41.91zm-4 1.8l-1.4.63-.4-.91 1.39-.63.41.91zm-4 1.8l-1.4.63-.4-.91 1.39-.63.41.91z"></path></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Fibonacci Wedge"
      @click="selectDrawing(DrawingType.FibonacciWedge)"  
    >
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M21.5 23h-14v1h14zM5 7.5v14h1v-14z"></path><path d="M12 23c0-3.314-2.686-6-6-6h-.5v1h.5c2.761 0 5 2.239 5 5v.5h1v-.5z"></path><path d="M20 23c0-7.732-6.268-14-14-14h-.5v1h.5c7.18 0 13 5.82 13 13v.5h1v-.5z"></path><path d="M16 23c0-5.523-4.477-10-10-10h-.5v1h.5c4.971 0 9 4.029 9 9v.5h1v-.5z"></path><path d="M5.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM23.5 25c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 25c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Fibonacci Spiral"
      @click="selectDrawing(DrawingType.FibonacciSpiral)"  
    >
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M4.395 10.18c3.432-4.412 10.065-4.998 13.675-.973l.745-.668c-4.044-4.509-11.409-3.858-15.209 1.027l.789.614z"></path><path d="M19.991 12.494c.877 2.718.231 5.487-1.897 7.543-2.646 2.556-6.752 2.83-9.188.477-1.992-1.924-2.027-5.38-.059-7.281 1.582-1.528 3.78-1.587 5.305-.115 1.024.99 1.386 2.424.876 3.491l.902.431c.709-1.482.232-3.37-1.084-4.641-1.921-1.855-4.734-1.78-6.695.115-2.378 2.297-2.337 6.405.059 8.719 2.846 2.749 7.563 2.435 10.577-.477 2.407-2.325 3.147-5.493 2.154-8.569l-.952.307z"></path><path d="M21.01 9.697l3.197-3.197-.707-.707-3.197 3.197z"></path><path d="M14.989 15.719l3.674-3.674-.707-.707-3.674 3.674z"></path><path d="M13.5 18c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM19.5 12c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
    <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Curve"
      @click="selectDrawing(DrawingType.Curve)"  
    >
      <svg class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M6.256 20.652c.548-3.024 1.607-5.962 3.329-8.312l-.807-.591c-1.825 2.493-2.933 5.565-3.506 8.725l.984.178z"></path><path d="M12.243 9.657c2.365-1.764 5.345-2.846 8.416-3.402l-.178-.984c-3.21.581-6.326 1.712-8.836 3.584l.598.802z"></path><path d="M10.5 12c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
        <button 
      class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear"
      title="Polyline"
      @click="selectDrawing(DrawingType.Polyline)"  
    >
    <svg  class="w-full h-full max-w-[100%] max-h-[100%]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><g fill="currentColor" fill-rule="nonzero"><path d="M16.5 6h4v-1h-4z" id="Line"></path><path d="M16.5 15h4v-1h-4z"></path><path d="M8.5 23h4v-1h-4z"></path><path d="M8.298 11.591l5.097-4.46-.659-.753-5.097 4.46zM22 7.5v5h1v-5z"></path><path d="M14 16.5v4h1v-4z"></path><path d="M6 14.5v6h1v-6z"></path><path d="M6.5 14c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM14.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM14.5 16c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 16c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM6.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM14.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path></g></svg>
    </button>
  </nav>
  <div class="text-sm text-gray-200">
    <span class="p-2">v1.2.0</span>
  </div>
</aside>
</template>

<style scoped>

</style>
