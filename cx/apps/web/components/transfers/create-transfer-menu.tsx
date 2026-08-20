"use client"

import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

type CreateTransferMenuProps = {
  triggerLabel?: string
  triggerClassName?: string
  sendHref?: string
}

export function CreateTransferMenu({
  triggerLabel = "Create transfer",
  triggerClassName = "h-9 px-3",
  sendHref = "/transfers/new/send",
}: CreateTransferMenuProps = {}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" className={triggerClassName} />}
      >
        <Plus data-icon="inline-start" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create transfer</DialogTitle>
          <DialogDescription>
            Choose whether funds are going out or coming in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-1">
          <Link
            href={sendHref}
            onClick={() => setOpen(false)}
            className="group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted"
          >
            <span className="grid size-10 place-items-center rounded-lg border bg-background">
              <ArrowUpRight className="size-4" />
            </span>
            <span>
              <strong className="block text-sm">Send</strong>
              <small className="text-muted-foreground">
                Transfer funds to someone
              </small>
            </span>
          </Link>
          <Link
            href="/transfers/new/request"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted"
          >
            <span className="grid size-10 place-items-center rounded-lg border bg-background">
              <ArrowDownLeft className="size-4" />
            </span>
            <span>
              <strong className="block text-sm">Request</strong>
              <small className="text-muted-foreground">
                Create a link for someone to transfer funds to you
              </small>
            </span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
