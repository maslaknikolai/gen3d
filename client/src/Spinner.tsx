// Stays in the page and fades, so it does not jump in and out.
export function Spinner({ visible = true }: { visible?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin leading-none font-black transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      +
    </span>
  )
}
