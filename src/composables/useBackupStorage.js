import { computed, ref } from 'vue'

const DB_NAME = 'youzi-postage-calculator'
const STORE_NAME = 'backup-settings'
const DIRECTORY_KEY = 'backup-directory'
const BACKUP_FOLDER = '郵資大師備份'
const SNAPSHOT_FOLDER = 'snapshots'
const MAX_AUTO_SNAPSHOTS = 50

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readHandle() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(DIRECTORY_KEY)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

async function saveHandle(handle) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put(handle, DIRECTORY_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function removeHandle() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .delete(DIRECTORY_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function snapshotFilename() {
  return `auto-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_')}.json`
}

export function useBackupStorage() {
  const directoryHandle = ref(null)
  const permission = ref('prompt')
  const autoSnapshotCount = ref(0)
  const lastBackupAt = ref('')
  const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const isConfigured = computed(() => Boolean(directoryHandle.value))

  async function refreshSnapshotInfo() {
    if (!directoryHandle.value || permission.value !== 'granted') return
    const backupDirectory = await directoryHandle.value.getDirectoryHandle(BACKUP_FOLDER, {
      create: false,
    })
    const snapshots = await backupDirectory.getDirectoryHandle(SNAPSHOT_FOLDER, { create: false })
    const files = []
    for await (const [name, handle] of snapshots.entries()) {
      if (handle.kind === 'file' && /^auto-.*\.json$/.test(name)) files.push(name)
    }
    files.sort()
    autoSnapshotCount.value = files.length
    lastBackupAt.value = files.at(-1)?.slice(5, -5).replace('_', ' ').replaceAll('-', ':') || ''
  }

  async function initialise() {
    if (!supported) return
    try {
      directoryHandle.value = await readHandle()
      if (!directoryHandle.value) return
      permission.value = await directoryHandle.value.queryPermission({ mode: 'readwrite' })
      if (permission.value === 'granted') await refreshSnapshotInfo()
    } catch {
      directoryHandle.value = null
      permission.value = 'prompt'
    }
  }

  async function chooseDirectory() {
    if (!supported) throw new Error('目前瀏覽器不支援指定備份資料夾，請使用下載備份檔。')
    directoryHandle.value = await window.showDirectoryPicker({ mode: 'readwrite' })
    permission.value = 'granted'
    await saveHandle(directoryHandle.value)
    autoSnapshotCount.value = 0
    lastBackupAt.value = ''
  }

  async function requireWritePermission({ request = false } = {}) {
    if (!directoryHandle.value) throw new Error('請先設定備份資料夾。')
    permission.value = await directoryHandle.value.queryPermission({ mode: 'readwrite' })
    if (permission.value !== 'granted' && request) {
      permission.value = await directoryHandle.value.requestPermission({ mode: 'readwrite' })
    }
    if (permission.value !== 'granted') throw new Error('備份資料夾尚未授予讀寫權限。')
  }

  async function writeAutoSnapshot(data, { requestPermission = false } = {}) {
    if (!directoryHandle.value) return false
    await requireWritePermission({ request: requestPermission })
    const backupDirectory = await directoryHandle.value.getDirectoryHandle(BACKUP_FOLDER, {
      create: true,
    })
    const snapshots = await backupDirectory.getDirectoryHandle(SNAPSHOT_FOLDER, { create: true })
    const fileHandle = await snapshots.getFileHandle(snapshotFilename(), { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(
      JSON.stringify(
        { ...data, backupMeta: { type: 'auto', createdAt: new Date().toISOString() } },
        null,
        2
      )
    )
    await writable.close()

    const files = []
    for await (const [name, handle] of snapshots.entries()) {
      if (handle.kind === 'file' && /^auto-.*\.json$/.test(name)) files.push(name)
    }
    files.sort()
    await Promise.all(files.slice(0, -MAX_AUTO_SNAPSHOTS).map(name => snapshots.removeEntry(name)))
    await refreshSnapshotInfo()
    return true
  }

  async function disconnectDirectory() {
    await removeHandle()
    directoryHandle.value = null
    permission.value = 'prompt'
    autoSnapshotCount.value = 0
    lastBackupAt.value = ''
  }

  return {
    supported,
    isConfigured,
    permission,
    autoSnapshotCount,
    lastBackupAt,
    initialise,
    chooseDirectory,
    writeAutoSnapshot,
    disconnectDirectory,
  }
}
