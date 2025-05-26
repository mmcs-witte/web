<script setup lang="ts">
import Chart from './components/Chart.vue';
import DrawingsToolbar from './components/DrawingsToolbar.vue';
import WitteHeader from './components/WitteHeader.vue'
</script>

<template>
  <div class="flex flex-col h-full space-y-2">
    <WitteHeader />
    <main class="flex flex-row h-full w-full grow space-x-2">
      <DrawingsToolbar />
      <div class="rounded-md w-full h-full bg-gray-800">
        <Chart class="bg-gray-800"/>
      </div>
<!--      TODO: Сделать ApiSelector-->
<!--      <div class="h-full bg-gray-500 basis-112 rounded-md flex flex-col items-center">-->
<!--        <span class="text-black font-bold">API Selector</span>-->
<!--      </div>-->
    </main>
  </div>
</template>

<style scoped>
</style>
