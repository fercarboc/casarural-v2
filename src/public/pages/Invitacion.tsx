import { useState } from 'react'
import { supabase } from '../../integrations/supabase/client';

export default function Invitacion() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (password !== confirm) {
      alert('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password
    })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      alert('Cuenta activada')
      window.location.href = '/admin'
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto' }}>
      <h2>Activar cuenta</h2>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <button onClick={handleSubmit} disabled={loading}>
        Guardar contraseña
      </button>
    </div>
  )
}