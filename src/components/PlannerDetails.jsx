export default function PlannerDetails({ planning, evidenceRows = [] }) {
  if (!planning) return null
  return <section className="planner-panel" aria-label="CodeBuddy plan and interpretation">
    <p className="planner-label">CodeBuddy interpretation · human review required</p>
    {planning.interpretations?.length ? planning.interpretations.map((item,index)=><div key={index} className="planner-finding">
      <p>{item.text}</p>
      <details><summary>Inspect supporting facts</summary>{item.factIds.map(id=><p key={id}>{evidenceRows.find(row=>row.id===id)?.statement || id}</p>)}</details>
    </div>) : <p className="planner-muted">No AI interpretation is displayed. Use the factual evidence and any warnings above.</p>}
    {planning.answerability === 'partial' && <p>Only part of the question is supported by the retrieved evidence.</p>}
    <details className="planner-trace"><summary>View retrieval plan and tool results</summary>
      <p><strong>Interpreted question:</strong> {planning.plan?.intent}</p>
      {planning.retrievalAttempts?.length > 1 && <div className="planner-finding">
        <p><strong>One follow-up retrieval was used.</strong></p>
        <p>{planning.retrievalAttempts[1].reason}</p>
        <p>{planning.retrievalAttempts[1].newFactIds.length} additional facts retrieved. More facts do not by themselves establish clinical meaning.</p>
      </div>}
      {(planning.trace || []).map((step,index)=><div className="planner-finding" key={index}>
        <p><strong>{step.tool.replaceAll('_',' ')}</strong> · {step.returned} of {step.matched} matching facts returned{step.truncated ? ' (limited)' : ''}</p>
        <p className="planner-arguments">{JSON.stringify(step.arguments)}</p>
      </div>)}
      <p className="planner-muted">Tools and values are checked in code. Valid citations and AI review do not establish clinical correctness.</p>
    </details>
  </section>
}
