<script setup lang="ts">
  import Chart from './components/Chart.vue'
  import WitteHeader from './components/WitteHeader.vue'
</script>

<template>
  <div class="flex flex-col h-full space-y-2">
    <WitteHeader />
    <main class="flex flex-row w-full grow space-x-2">
      <aside class="flex-none basis-16 flex flex-col h-full items-center justify-between rounded-md bg-gray-800 py-2">
        <nav class="flex flex-col w-full space-y-2 px-1">
          <div class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear">
            <FontAwesomeIcon :icon="['fas', 'palette']" size="2x" />
          </div>
          <div class="hover:bg-gray-700 aspect-square rounded-md p-2 flex items-center justify-around duration-100 ease-linear">
            <FontAwesomeIcon :icon="['fas', 'ruler']" size="2x" />
          </div>
        </nav>
        <div class="text-sm text-gray-200">
          <span class="p-2">v0.1.0</span>
        </div>
      </aside>
      <div class="flex-auto rounded flex-row items-center justify-center w-full h-full overflow-y-auto bg-gray-800">
        <Chart />
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
