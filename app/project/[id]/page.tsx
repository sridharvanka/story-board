import Canvas from '@/components/Canvas'

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <Canvas projectId={parseInt(params.id)} />
}
