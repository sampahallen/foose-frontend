import { useNavigationStore } from '../stores/navigationMemoryStore'

export function useCurrentNavigationEntry() {
  const currentEntryId = useNavigationStore((state) => state.currentEntryId)
  return useNavigationStore((state) => state.entries.find((entry) => entry.id === currentEntryId))
}

export function useCurrentNavigationEntryId() {
  return useNavigationStore((state) => state.currentEntryId)
}
