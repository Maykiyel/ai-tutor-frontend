import { Center, Loader } from '@mantine/core'

type PageLoaderProps = {
  minHeight?: string | number
}

export function PageLoader({ minHeight = '40vh' }: PageLoaderProps) {
  return (
    <Center mih={minHeight}>
      <Loader aria-label="Loading" />
    </Center>
  )
}
