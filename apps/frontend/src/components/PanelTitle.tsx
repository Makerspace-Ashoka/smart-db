export function PanelTitle(props: { title: string; copy: string }) {
  return (
    <div className="panel-title">
      <h2>{props.title}</h2>
      <p>{props.copy}</p>
    </div>
  );
}
