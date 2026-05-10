'use client';

import { useState } from 'react';
import OrderFollowUpModal from './OrderFollowUpModal';

type Member = { id: string; fullName: string };

type Props = {
  customerPhone: string;
  orderId: string;
  orderDate: string;            // ISO string (serializable)
  productNames: string[];
  isFirstOrder: boolean;
  currentUserId: string;
  members: Member[];
  hasExistingTasks: boolean;
};

export default function SetTaskButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn"
        style={{
          fontSize: 11, padding: '0.2rem 0.55rem',
          background: props.hasExistingTasks ? '#f1f5f9' : 'var(--blue-light)',
          color: props.hasExistingTasks ? '#64748b' : 'var(--primary)',
          border: '1px solid var(--border)',
          fontWeight: 600, whiteSpace: 'nowrap',
        }}
        title={props.hasExistingTasks ? 'ออเดอร์นี้มีงานติดตามแล้ว — เพิ่มเพิ่มเติมได้' : 'ตั้งงานติดตามจากออเดอร์นี้'}
      >
        {props.hasExistingTasks
          ? <><i className="ri-check-line"></i> มีงานแล้ว</>
          : <><i className="ri-add-circle-line"></i> ตั้งงาน</>}
      </button>

      <OrderFollowUpModal
        open={open}
        onClose={() => setOpen(false)}
        customerPhone={props.customerPhone}
        orderId={props.orderId}
        orderDate={new Date(props.orderDate)}
        productNames={props.productNames}
        isFirstOrder={props.isFirstOrder}
        currentUserId={props.currentUserId}
        members={props.members}
      />
    </>
  );
}
