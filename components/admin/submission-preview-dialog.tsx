"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SubmissionPreviewDialogProps {
  submission: any
  trigger?: React.ReactNode
}

export function SubmissionPreviewDialog({ submission, trigger }: SubmissionPreviewDialogProps) {
  const formFields = (submission.forms?.schema as any)?.fields || []

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Zobacz odpowiedź
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Odpowiedź: {submission.forms?.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
             {/* Client Info */}
             <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div>
                   <span className="text-gray-500 block">Klient</span>
                   <span className="font-medium">{submission.client_name}</span>
                </div>
                <div>
                   <span className="text-gray-500 block">Data</span>
                   <span className="font-medium">
                     {new Date(submission.created_at).toLocaleString('pl-PL')}
                   </span>
                </div>
             </div>

             {/* Fields */}
             <div className="space-y-4">
                {formFields.map((field: any) => {
                    const value = (submission.data as any)?.[field.name]
                    if (field.type === 'separator') return null

                    const isSignature = field.type === 'signature' || field.type === 'Signature'
                    
                    return (
                    <div key={field.name} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {field.label || field.name}
                        </p>
                        {isSignature && value ? (
                        <div className="mt-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                            src={value} 
                            alt="Podpis" 
                            className="max-w-[200px] h-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white"
                            />
                        </div>
                        ) : (
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {typeof value === 'boolean' 
                            ? (value ? 'Tak' : 'Nie') 
                            : (value || <span className="text-gray-400 italic">Brak odpowiedzi</span>)}
                        </p>
                        )}
                    </div>
                    )
                })}
             </div>

             {/* Signature */}
             {submission.signature && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 mb-2">Podpis końcowy</p>
                    <img 
                        src={submission.signature} 
                        alt="Podpis klienta" 
                        className="max-w-[200px] border border-gray-200 rounded-lg"
                    />
                </div>
             )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
