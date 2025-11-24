import React from 'react';

interface OrderReceiptProps {
  order: any;
}

export const OrderReceipt = React.forwardRef<HTMLDivElement, OrderReceiptProps>((props, ref) => {
  const { order } = props;

  // Guard against null or undefined order/products
  if (!order || !order.products) {
    return <div ref={ref}></div>; // Render an empty div if data is not ready
  }

  const sum = order.products.reduce((acc: number, p: any) => acc + parseFloat(p.price || 0), 0);

  return (
    <div ref={ref} className="p-4 bg-white text-black font-mono" style={{ width: '60mm', height: '90mm' }}>
      <style type="text/css" media="print">
        {`
          @page { size: 60mm 90mm; margin: 0; }
          body { margin: 0; }
        `}
      </style>
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">Boguś Collection</h1>
        <p className="text-xs">Dziękujemy za zakupy!</p>
      </div>
      <div className="mb-4">
        <p className="text-sm font-bold">Zamówienie #{order.order_id}</p>
        <p className="text-xs">Data: {new Date(order.date).toLocaleDateString()}</p>
        <p className="text-xs">Klient: {order.delivery_fullname}</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left">Produkt</th>
            <th className="text-right">Cena</th>
          </tr>
        </thead>
        <tbody>
          {order.products.map((p: any) => (
            <tr key={p.product_id}>
              <td>{p.name}</td>
              <td className="text-right">{parseFloat(p.price).toFixed(2)} zł</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-black my-2"></div>
      <div className="text-right">
        <p className="text-sm font-bold">Suma: {sum.toFixed(2)} zł</p>
      </div>
    </div>
  );
});
