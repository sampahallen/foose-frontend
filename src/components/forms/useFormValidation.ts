import { useCallback, useMemo, useRef, useState } from 'react'

export type FieldErrors<T> = Partial<Record<keyof T, string>>
export type FieldValidators<T> = Partial<{
  [Key in keyof T]: (value: T[Key], values: T) => string | undefined
}>

function focusInvalidField(field: PropertyKey) {
  const name = String(field)
  const byId = document.getElementById(name)
  const byName = Array.from(document.querySelectorAll<HTMLElement>('[name]')).find((element) => element.getAttribute('name') === name)
  ;(byId || byName)?.focus()
}

export function useFormValidation<T extends Record<string, unknown>>({
  initialValues,
  validate,
  validators = {},
}: {
  initialValues: T
  validate?: (values: T) => FieldErrors<T>
  validators?: FieldValidators<T>
}) {
  const [values, setValues] = useState<T>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const allErrors = useMemo(() => {
    const nextErrors: FieldErrors<T> = {}
    Object.assign(nextErrors, validate?.(values) || {})
    for (const field of Object.keys(validators) as Array<keyof T>) {
      const message = validators[field]?.(values[field], values)
      if (message) nextErrors[field] = message
      else if (!validate) delete nextErrors[field]
    }
    return nextErrors
  }, [validate, validators, values])

  const errors = useMemo(() => {
    if (submitAttempted) return allErrors
    const visible: FieldErrors<T> = {}
    for (const field of Object.keys(allErrors) as Array<keyof T>) {
      if (touched[field]) visible[field] = allErrors[field]
    }
    return visible
  }, [allErrors, submitAttempted, touched])

  const dirty = useMemo(
    () => (Object.keys(initialValues) as Array<keyof T>).some((field) => !Object.is(initialValues[field], values[field])),
    [initialValues, values],
  )

  const setValue = useCallback(<Key extends keyof T>(field: Key, value: T[Key]) => {
    setValues((current) => ({ ...current, [field]: value }))
  }, [])

  const markTouched = useCallback((field: keyof T) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }, [])

  const validateForm = useCallback(() => {
    setSubmitAttempted(true)
    const invalidFields = Object.keys(allErrors) as Array<keyof T>
    setTouched(Object.fromEntries((Object.keys(values) as Array<keyof T>).map((field) => [field, true])) as Partial<Record<keyof T, boolean>>)
    if (invalidFields.length) {
      window.requestAnimationFrame(() => {
        const summary = document.querySelector<HTMLElement>('[data-form-error-summary]')
        if (summary) summary.focus()
        else focusInvalidField(invalidFields[0])
      })
      return false
    }
    return true
  }, [allErrors, values])

  const submit = useCallback(async (onValid: (values: T) => void | Promise<void>) => {
    if (submittingRef.current || !validateForm()) return false
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      await onValid(values)
      return true
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }, [validateForm, values])

  const reset = useCallback((nextValues: T = initialValues) => {
    setValues(nextValues)
    setTouched({})
    setSubmitAttempted(false)
    submittingRef.current = false
    setIsSubmitting(false)
  }, [initialValues])

  return {
    allErrors,
    dirty,
    errors,
    isSubmitting,
    markTouched,
    reset,
    setIsSubmitting,
    setSubmitAttempted,
    setTouched,
    setValue,
    setValues,
    submit,
    submitAttempted,
    touched,
    validateForm,
    values,
  }
}
