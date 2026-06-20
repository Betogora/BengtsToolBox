import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function TableContainer({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'w-full min-w-0 overflow-x-auto rounded-md border bg-background',
        className,
      )}
      {...props}
    />
  )
}

function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table
      data-slot="table"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-muted/70 text-left', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-t align-middle transition-colors first:border-t-0 hover:bg-muted/20',
        className,
      )}
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
      className={cn('p-2.5', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
}
