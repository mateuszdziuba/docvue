import React, { useState, useCallback, useRef } from 'react'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
import type { FormFieldType } from '@/types'
import { FieldItem } from '@/screens/field-item'

import { LuRows2 } from 'react-icons/lu'

export type FormFieldOrGroup = FormFieldType | FormFieldType[]

type FormFieldListProps = {
  formFields: FormFieldOrGroup[]
  setFormFields: React.Dispatch<React.SetStateAction<FormFieldOrGroup[]>>
  updateFormField: (path: number[], updates: Partial<FormFieldType>) => void
  openEditDialog: (field: FormFieldType) => void
}

function getItemKey(item: FormFieldOrGroup): string {
  return Array.isArray(item) ? item.map((f) => f.name).join('-') : item.name
}

export const FormFieldList: React.FC<FormFieldListProps> = ({
  formFields,
  setFormFields,
  updateFormField,
  openEditDialog,
}) => {
  const [rowTabs, setRowTabs] = useState<{ [key: number]: FormFieldType[] }>({})
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [indicatorY, setIndicatorY] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const draggingKeyRef = useRef<string | null>(null)
  const formFieldsRef = useRef(formFields)
  formFieldsRef.current = formFields

  const calcInsert = useCallback((e: PointerEvent) => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const clientY = e.clientY

    const entries = formFieldsRef.current
      .map((item) => {
        const key = getItemKey(item)
        if (key === draggingKeyRef.current) return null
        const el = itemRefs.current.get(key)
        if (!el) return null
        return el.getBoundingClientRect()
      })
      .filter(Boolean) as DOMRect[]

    if (entries.length === 0) {
      setIndicatorY(4)
      return
    }

    let gapY: number
    if (clientY <= entries[0].top + entries[0].height / 2) {
      gapY = entries[0].top - containerRect.top - 4
    } else if (clientY >= entries[entries.length - 1].top + entries[entries.length - 1].height / 2) {
      gapY = entries[entries.length - 1].bottom - containerRect.top + 2
    } else {
      gapY = entries[entries.length - 1].bottom - containerRect.top + 2
      for (let i = 0; i < entries.length - 1; i++) {
        if (clientY < entries[i + 1].top + entries[i + 1].height / 2) {
          gapY = (entries[i].bottom + entries[i + 1].top) / 2 - containerRect.top
          break
        }
      }
    }

    setIndicatorY(gapY)
  }, [])

  const handleDragStart = useCallback(
    (key: string) => {
      draggingKeyRef.current = key
      setDraggingKey(key)
      window.addEventListener('pointermove', calcInsert)
    },
    [calcInsert],
  )

  const handleDragEnd = useCallback(() => {
    draggingKeyRef.current = null
    setDraggingKey(null)
    setIndicatorY(null)
    window.removeEventListener('pointermove', calcInsert)
  }, [calcInsert])

  const handleHorizontalReorder = useCallback(
    (index: number, newOrder: FormFieldType[]) => {
      setRowTabs((prev) => ({ ...prev, [index]: newOrder }))

      // Delay setFormFields by 1 second
      setTimeout(() => {
        setFormFields((prevFields) => {
          const updatedFields = [...prevFields]
          updatedFields[index] = newOrder
          return updatedFields
        })
      }, 1000)
    },
    [setFormFields],
  )

  return (
    <div className="mt-3 lg:mt-0">
      <div ref={containerRef} className="relative">
        <Reorder.Group
          axis="y"
          onReorder={setFormFields}
          values={formFields}
          className="flex flex-col gap-1"
        >
          {formFields.map((item, index) => {
            const key = getItemKey(item)
            return (
              <Reorder.Item
                ref={(el) => {
                  if (el) itemRefs.current.set(key, el as HTMLElement)
                  else itemRefs.current.delete(key)
                }}
                key={key}
                value={item}
                className="flex items-center gap-1"
                whileDrag={{ backgroundColor: '#e5e7eb', borderRadius: '12px' }}
                onDragStart={() => handleDragStart(key)}
                onDragEnd={handleDragEnd}
              >
                <LuRows2 className="cursor-grab w-4 h-4" />
                {Array.isArray(item) ? (
                  <Reorder.Group
                    as="ul"
                    axis="x"
                    onReorder={(newOrder) =>
                      handleHorizontalReorder(index, newOrder)
                    }
                    values={rowTabs[index] || item}
                    className="w-full grid grid-cols-12 gap-1"
                  >
                    <AnimatePresence initial={false}>
                      {(rowTabs[index] || item).map((field, fieldIndex) => (
                        <FieldItem
                          key={field.name}
                          index={index}
                          subIndex={fieldIndex}
                          field={field}
                          formFields={formFields}
                          setFormFields={setFormFields}
                          updateFormField={updateFormField}
                          openEditDialog={openEditDialog}
                        />
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                ) : (
                  <FieldItem
                    field={item}
                    index={index}
                    formFields={formFields}
                    setFormFields={setFormFields}
                    updateFormField={updateFormField}
                    openEditDialog={openEditDialog}
                  />
                )}
              </Reorder.Item>
            )
          })}
        </Reorder.Group>

        {/* Drop position indicator */}
        <AnimatePresence>
          {draggingKey !== null && indicatorY !== null && (
            <motion.div
              key="drop-indicator"
              className="absolute left-0 right-0 flex items-center gap-0 pointer-events-none z-50"
              style={{ top: indicatorY }}
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.6 }}
              transition={{ duration: 0.1 }}
            >
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 -ml-1" />
              <div className="flex-1 h-0.5 bg-primary rounded-full" />
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 -mr-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
