<script setup lang="ts">
// import HelloWorld from './components/HelloWorld.vue'
import Chart from './components/Chart.vue'
</script>

<template>
  <div class="flex flex-row items-center justify-center w-full h-full overflow-y-auto space-x-2">
    <nav class="flex-none w-16 flex-col space-y-4 items-center justify-center h-full overflow-y-auto rounded-xl bg-gray-800">
      <div class="bg-sky-900 w-16 h-16 rounded-lg border border-sky-800 p-4">
        <span>A</span>
      </div>
      <div class="bg-sky-900 w-16 h-16 rounded-lg border border-sky-800 p-4">
        <span>C</span>
      </div>
      <div class="bg-sky-900 w-16 h-16 rounded-lg border border-sky-800 p-4">
        <span>B</span>
      </div>
    </nav>
    <div class="flex-auto rounded-xl flex-row items-center justify-center w-full h-full overflow-y-auto bg-gray-800">
      <Chart></Chart>
    </div>
  </div>
<!--  <p>-->
<!--    <strong>Current route path:</strong> {{ $route.fullPath }}-->
<!--  </p>-->
<!--  <HelloWorld msg="Witte" />-->
</template>

<style scoped>
</style>
