import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Table({
  className,
  containerClassName,
  ...props
}: ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'w-full min-w-0 overflow-x-auto rounded-md border bg-card',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn('w-full text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <thead
      data-slot="table-header"
      className="bg-muted/70 text-left"
    >
      <TableRow className={className} {...props} />
    </thead>
  )
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr]:border-t', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('align-middle', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn('p-3 font-semibold', className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('p-3', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
}
