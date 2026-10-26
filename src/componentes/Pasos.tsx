export function Pasos({ actual, total = 3 }: { actual: number; total?: number }) {
  return (
    <>
      <div className="pasos" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < actual ? 'on' : ''} />
        ))}
      </div>
      <p className="mut">
        Paso {actual} de {total}
      </p>
    </>
  )
}
