'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  Toast,
} from '@/components/ui';

export default function UiTest() {
  const [modalOpen, setModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <h1 className="font-heading text-2xl text-white">UI primitives</h1>

      <section className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <Input label="Email" name="email" placeholder="you@example.com" />
        <Input label="Password" name="password" type="password" error="Required" />
      </section>

      <section className="flex flex-wrap gap-3">
        <Badge variant="active">Active</Badge>
        <Badge variant="completed">Completed</Badge>
        <Badge variant="pending">Pending</Badge>
      </section>

      <Card shadow className="flex items-center gap-3">
        <Spinner />
        <span className="font-mono text-sm">Card with hard shadow + spinner</span>
      </Card>

      <section className="flex gap-3">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button variant="ghost" onClick={() => setShowToast(true)}>
          Show toast
        </Button>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example modal"
      >
        <p className="mb-4 font-body text-sm text-gray-400">
          Tab cycles between the inputs and buttons. Escape closes.
        </p>
        <Input label="Field one" name="f1" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setModalOpen(false)}>Confirm</Button>
        </div>
      </Modal>

      {showToast && (
        <Toast
          message="Saved — auto-dismisses in 3s"
          variant="success"
          onDismiss={() => setShowToast(false)}
        />
      )}
    </main>
  );
}
