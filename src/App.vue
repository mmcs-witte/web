<script setup lang="ts">
  import Chart from './components/Chart.vue'
  import Header from './components/Header.vue'
</script>

<template>
  <div class="flex flex-col h-full space-y-2">
    <Header />
    <main class="flex flex-row w-full grow space-x-2">
      <aside class="flex-none basis-16 flex flex-col h-full items-center justify-between rounded-md bg-gray-800">
        <nav class="flex flex-col w-full space-y-2 p-1">
          <div class="bg-sky-900 rounded-md border border-sky-800 p-4">
            <FontAwesomeIcon :icon="['fas', 'palette']" />
          </div>
          <div class="bg-sky-900 rounded-md border border-sky-800 p-4">
            <FontAwesomeIcon :icon="['fas', 'palette']" />
          </div>
        </nav>
        <div class="text-sm text-gray-200 pb-2">
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
