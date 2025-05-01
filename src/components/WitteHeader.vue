<script setup lang="ts">
import ChartTypeSelect from "./ChartTypeSelect.vue"
import IndicatorsSelect from "./IndicatorsSelect.vue";
</script>

<template>
  <header class="bg-gray-800 flex flex-row basis-12 items-center rounded-md justify-start space-x-4 p-2">
    <span>Witte</span>
    <ChartTypeSelect />
    <IndicatorsSelect />
  </header>
</template>

<style scoped>

</style>
