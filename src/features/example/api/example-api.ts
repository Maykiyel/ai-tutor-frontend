import { apiClient } from '@/lib/api/client'

export type ExampleItem = {
  id: string
  name: string
}

export async function getExampleItems() {
  const response = await apiClient.get<ExampleItem[]>('/example/items')
  return response.data
}

export type CreateExampleItemInput = {
  name: string
}

export async function createExampleItem(input: CreateExampleItemInput) {
  const response = await apiClient.post<ExampleItem>('/example/items', input)
  return response.data
}
