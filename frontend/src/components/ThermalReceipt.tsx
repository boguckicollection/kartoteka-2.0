import React from 'react';

interface ThermalReceiptProps {
  order: any;
}

export const ThermalReceipt = React.forwardRef<HTMLDivElement, ThermalReceiptProps>((props, ref) => {
  const { order } = props;

  if (!order || !order.products) {
    return <div ref={ref} />;
  }

  const sum = order.products.reduce((acc: number, p: any) => acc + (parseFloat(p.price || 0) * (p.quantity || 1)), 0);

  return (
    <div ref={ref} style={{ width: '60mm', padding: '8px', boxSizing: 'border-box', backgroundColor: 'white', color: 'black', fontFamily: 'monospace' }}>
      <style type="text/css" media="print">
        {`
          @page { size: 60mm 90mm; margin: 0; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: '700' }}>KARTOTEKA.SHOP</h1>
        <p style={{ fontSize: '0.75rem' }}>Dziękujemy za zakup!</p>
      </div>
      
      <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

      <div style={{ fontSize: '0.75rem' }}>
        <p><strong>Kupujący:</strong> {order.delivery_fullname}</p>
      </div>

      <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

      <ol style={{ listStyleType: 'decimal', listStylePosition: 'inside', paddingLeft: 0, margin: 0, fontSize: '0.75rem' }}>
        {order.products.map((p: any, index: number) => (
          <li key={p.product_id || index} style={{ marginBottom: '4px' }}>
            <div>{p.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '1.5rem' }}>
              <span>{p.quantity} szt.</span>
              <span>{(parseFloat(p.price) * p.quantity).toFixed(2)} zł</span>
            </div>
          </li>
        ))}
      </ol>

      <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: '700' }}>Suma: {sum.toFixed(2)} zł</p>
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem' }}>
        <p>Zapraszamy ponownie!</p>
      </div>
    </div>
  );
});
