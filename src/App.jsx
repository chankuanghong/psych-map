import React, { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import PatientSelector from './components/PatientSelector.jsx'
import PatientMAP from './components/PatientMAP.jsx'
import ClinicalInsights from './components/ClinicalInsights.jsx'
import MethodPanel from './components/MethodPanel.jsx'
import ProfessionEntry from './components/ProfessionEntry.jsx'
import DirectorDashboard from './components/DirectorDashboard.jsx'
import { getProfession } from './data/professions.js'
import { installRuntimeData } from './data/runtimeData.js'

const isAdminPath = () => ['/admin', '/director'].includes(window.location.pathname)

export default function App() {
  const [activeTab, setActiveTab] = useState(() => isAdminPath() ? 'director' : 'ward')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [range, setRange] = useState([1, 1])
  const [excludedDays, setExcludedDays] = useState([])
  const [dataError, setDataError] = useState(null)
  const [rfidLive, setRfidLive] = useState(null)
  const [professionId, setProfessionId] = useState(() => window.localStorage.getItem('psych-map-profession') || 'occupational_therapy')
  const [hasEntered, setHasEntered] = useState(() => Boolean(window.localStorage.getItem('psych-map-profession')))
  const profession = getProfession(professionId)
  const selectedDays = useMemo(
    () => Array.from({ length: range[1] - range[0] + 1 }, (_, index) => range[0] + index).filter(day => !excludedDays.includes(day)),
    [range, excludedDays],
  )

  useEffect(() => {
    const onPopState = () => setActiveTab(isAdminPath() ? 'director' : 'ward')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (isAdminPath()) return undefined
    let cancelled = false
    let timer
    const refreshRfid = async () => {
      try {
        const response = await fetch('/api/rfid/live', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'RFID feed unavailable')
        if (!cancelled) setRfidLive(payload)
      } catch {
        if (!cancelled) setRfidLive(current => current ? { ...current, stale: true } : null)
      } finally {
        if (!cancelled) timer = window.setTimeout(refreshRfid, 2_000)
      }
    }
    refreshRfid()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/bootstrap').then(async response => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Database API unavailable')
      installRuntimeData(payload)
      if (cancelled) return
      setPatients(payload.patients)
      setSelectedPatient(payload.patients.find(patient => patient.isPrimaryDemo) || payload.patients[0] || null)
    }).catch(error => { if (!cancelled) setDataError(error.message) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedPatient) return
    setRange([1, selectedPatient.lengthOfStay])
    setExcludedDays([])
  }, [selectedPatient?.id, selectedPatient?.lengthOfStay])

  if (activeTab === 'director' && isAdminPath()) {
    return <div className="min-h-screen bg-slate-100"><DirectorDashboard /><div className="border-t border-slate-200 bg-white py-2 text-center text-xs text-slate-400">AGGREGATED DE-IDENTIFIED QUESTION ANALYTICS ONLY — Local admin demonstration</div></div>
  }

  const enterWorkspace = () => {
    window.localStorage.setItem('psych-map-profession', professionId)
    setHasEntered(true)
  }
  if (!hasEntered) return <ProfessionEntry selectedId={professionId} onSelect={setProfessionId} onContinue={enterWorkspace} />
  if (dataError) return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6"><div className="max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm"><h1 className="font-semibold text-rose-800">Psych-MAP could not load its database</h1><p className="mt-2 text-sm text-slate-600">{dataError}</p></div></div>
  if (!selectedPatient) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Loading Psych-MAP records from SQLite…</div>

  const selectPatient = patient => { setSelectedPatient(patient); setActiveTab('map') }
  const openPatientInsights = patient => { setSelectedPatient(patient); setActiveTab('insights') }
  const changeRange = updater => { setRange(current => typeof updater === 'function' ? updater(current) : updater); setExcludedDays([]) }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Header activeTab={activeTab} onTabChange={setActiveTab} selectedPatient={['map', 'insights'].includes(activeTab) ? selectedPatient : null} profession={profession} onChangeProfession={() => setHasEntered(false)} rfidLive={rfidLive} />
      <main className="flex-1 overflow-auto">
        {activeTab === 'ward' && <PatientSelector patients={patients} selectedPatient={selectedPatient} onSelect={selectPatient} onOpenInsights={openPatientInsights} profession={profession} />}
        {activeTab === 'map' && <PatientMAP patient={selectedPatient} profession={profession} rfidLive={rfidLive} />}
        {activeTab === 'insights' && <ClinicalInsights patient={selectedPatient} profession={profession} range={range} selectedDays={selectedDays} onRangeChange={changeRange} />}
        {activeTab === 'method' && <MethodPanel />}
      </main>
      <div className="border-t border-slate-200 bg-white py-2 text-center text-xs text-slate-400">DE-IDENTIFIED DEMONSTRATION DATA — No direct patient identifiers — Psych-MAP Prototype</div>
    </div>
  )
}
