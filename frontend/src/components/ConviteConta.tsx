import { Link } from 'react-router-dom'

import { LINK } from './estilos'

/** Fecha o aviso "fica só neste navegador" do Histórico e do painel (CR-005). */
export function ConviteConta() {
  return (
    <>
      {' '}
      <Link to="/conta" className={LINK}>
        Entre com o Google
      </Link>{' '}
      para guardá-lo na sua conta.
    </>
  )
}
