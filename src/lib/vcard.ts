// Universal vCard and contact utility for phone contacts syncing without Google

export interface ContactData {
  full_name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export function generateVCard(contacts: ContactData[]): string {
  return contacts.map(c => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:' + c.full_name,
    ]

    const parts = c.full_name.trim().split(' ')
    if (parts.length > 1) {
      const lastName = parts.pop()
      const firstName = parts.join(' ')
      lines.push('N:' + lastName + ';' + firstName + ';;;')
    } else {
      lines.push('N:' + c.full_name + ';;;;')
    }

    if (c.phone) {
      lines.push('TEL;TYPE=CELL,VOICE:' + c.phone)
    }

    if (c.email) {
      lines.push('EMAIL;TYPE=PREF,INTERNET:' + c.email)
    }

    if (c.address) {
      lines.push('ADR;TYPE=HOME:;;' + c.address + ';;;;')
    }

    const note = [c.notes, "Church Member - The Shepherd's Desk"].filter(Boolean).join(' | ')
    lines.push('NOTE:' + note)
    lines.push('END:VCARD')

    return lines.join('\r\n')
  }).join('\r\n')
}

export function downloadVCard(contacts: ContactData[], filename = 'church_directory.vcf') {
  const vcardText = generateVCard(contacts)
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseVCardText(text: string): ContactData[] {
  const contacts: ContactData[] = []
  const vcardBlocks = text.split(/BEGIN:VCARD/i).filter(b => b.trim().length > 0)

  for (const block of vcardBlocks) {
    let full_name = ''
    let phone: string | null = null
    let email: string | null = null
    let address: string | null = null
    let notes: string | null = null

    const lines = block.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('FN:')) {
        full_name = trimmed.replace('FN:', '').trim()
      } else if (!full_name && trimmed.startsWith('N:')) {
        const parts = trimmed.replace('N:', '').split(';')
        const last = parts[0] || ''
        const first = parts[1] || ''
        full_name = (first + ' ' + last).trim()
      } else if (/^TEL[;:]/i.test(trimmed)) {
        phone = trimmed.replace(/^TEL[^:]*:/i, '').trim()
      } else if (/^EMAIL[;:]/i.test(trimmed)) {
        email = trimmed.replace(/^EMAIL[^:]*:/i, '').trim()
      } else if (/^ADR[;:]/i.test(trimmed)) {
        address = trimmed.replace(/^ADR[^:]*:/i, '').replace(/;/g, ' ').trim()
      } else if (/^NOTE[;:]/i.test(trimmed)) {
        notes = trimmed.replace(/^NOTE[^:]*:/i, '').trim()
      }
    }

    if (full_name) {
      contacts.push({ full_name, phone, email, address, notes })
    }
  }

  return contacts
}

export function parseCSVContacts(csvText: string): ContactData[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/[\"\']/g, ''))
  const nameIdx = header.findIndex(h => h.includes('name') || h.includes('first'))
  const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('cell'))
  const emailIdx = header.findIndex(h => h.includes('email') || h.includes('mail'))
  const addrIdx = header.findIndex(h => h.includes('address') || h.includes('street'))

  if (nameIdx === -1) return []

  const contacts: ContactData[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/[\"\']/g, ''))
    const name = cols[nameIdx]
    if (!name) continue

    contacts.push({
      full_name: name,
      phone: phoneIdx !== -1 ? cols[phoneIdx] : null,
      email: emailIdx !== -1 ? cols[emailIdx] : null,
      address: addrIdx !== -1 ? cols[addrIdx] : null,
    })
  }

  return contacts
}
