import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/checkout/OrderPage'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: function OrderRoute() {
    const { orderId } = Route.useParams()
    return <OrderPage orderId={orderId} />
  },
})
