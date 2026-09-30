import type { PropsWithChildren } from 'react'
import { Container, type ContainerProps } from '@mantine/core'

type PageContainerProps = PropsWithChildren<{
  size?: ContainerProps['size']
}>

export function PageContainer({ children, size = 'lg' }: PageContainerProps) {
  return <Container size={size}>{children}</Container>
}
