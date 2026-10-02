import {
  Box,
  Button,
  Checkbox,
  Group,
  Paper,
  Progress,
  Radio,
  Stack,
  Text,
  Textarea,
  type ButtonProps,
  type TextareaProps,
} from '@mantine/core'
import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react'

import styles from './questionnaire.module.css'

/**
 * A multi-step questionnaire: one question on screen at a time, with progress,
 * fixed choices (single or multiple), a freeform answer beside or instead of
 * them, and an explicit skip for questions that may be left unanswered.
 *
 * Modelled on the shadcn Questionnaire, rebuilt on Mantine primitives. The parts
 * compose the same way:
 *
 * ```text
 * Questionnaire
 * ├── QuestionnaireProgress
 * ├── QuestionnaireItem
 * │   ├── QuestionnaireTitle
 * │   ├── QuestionnaireDescription
 * │   ├── QuestionnaireChoices
 * │   │   ├── QuestionnaireChoice
 * │   │   └── QuestionnaireInput
 * │   └── QuestionnaireError
 * └── QuestionnaireActions
 *     ├── QuestionnairePrevious
 *     ├── QuestionnaireSkip
 *     ├── QuestionnaireNext
 *     └── QuestionnaireSubmit
 * ```
 *
 * The questionnaire owns the ordered items, the active item, the answers,
 * validation, progress and navigation. Whatever contains it owns cancellation,
 * persistence, transport and branching.
 *
 * Two deliberate departures from the shadcn version. `onSubmit` receives typed
 * answers rather than a form event, because every caller here would otherwise
 * rebuild the same structure from `FormData`. And `required` lives only on the
 * `items` passed to the root, so the item list and the rendered items cannot
 * disagree about which questions may be skipped.
 *
 * Accessibility follows the original: an item is a `fieldset` and its title is
 * the `legend`; description and active error describe the item; invalid items
 * and their controls carry `aria-invalid`; fixed choices are native radios and
 * checkboxes; progress is a named progressbar; navigation is real buttons.
 * Successful navigation focuses the newly active item, and failed validation
 * focuses its first answer control.
 */

export type QuestionnaireItemConfig = {
  name: string
  /** Whether the item must be answered. An optional item can be skipped. */
  required?: boolean
  /** A disabled item is left out of navigation, progress, validation and the answers. */
  disabled?: boolean
}

export type QuestionnaireAnswer = {
  /** The values of the fixed choices picked, in the order they were picked. */
  choices: string[]
  /** What was written in the freeform input, if the item has one. */
  text: string
  /** True only when the learner pressed Skip, not when they left it blank. */
  skipped: boolean
}

export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>

const emptyAnswer: QuestionnaireAnswer = { choices: [], text: '', skipped: false }

const REQUIRED_MESSAGE = 'Answer this question to continue.'

function hasAnswer(answer: QuestionnaireAnswer) {
  return answer.choices.length > 0 || answer.text.trim().length > 0
}

type FocusRequest = {
  name: string
  target: 'item' | 'control'
  /** Bumped on every request, so asking for the same focus twice still moves it. */
  serial: number
}

type RootContextValue = {
  idPrefix: string
  items: QuestionnaireItemConfig[]
  activeName: string | undefined
  activeIndex: number
  answers: QuestionnaireAnswers
  errors: Record<string, string | undefined>
  disabled: boolean
  focusRequest: FocusRequest | null
  setChoice: (name: string, value: string, multiple: boolean, checked: boolean) => void
  setText: (name: string, text: string, multiple: boolean) => void
  previous: () => void
  next: () => void
  skip: () => void
}

const RootContext = createContext<RootContextValue | null>(null)

function useRoot() {
  const context = use(RootContext)

  if (!context) {
    throw new Error('Questionnaire parts must be rendered inside <Questionnaire>.')
  }

  return context
}

type QuestionnaireProps = PropsWithChildren<{
  items: readonly QuestionnaireItemConfig[]
  onSubmit: (answers: QuestionnaireAnswers) => void
  /** Answers to start from, for resuming a questionnaire part way through. */
  defaultValues?: QuestionnaireAnswers
  /** The active item's name, when the host controls navigation. */
  active?: string
  defaultActive?: string
  onActiveChange?: (name: string) => void
  /**
   * Extra validation run after the required check, for rules such as a Zod
   * schema. Return a message to stop on the item, or null to let it through.
   */
  validate?: (name: string, answer: QuestionnaireAnswer) => string | null
  /** Locks every answer and action, for example while the answers are being sent. */
  disabled?: boolean
  'aria-label'?: string
}>

export function Questionnaire({
  items: allItems,
  onSubmit,
  defaultValues,
  active,
  defaultActive,
  onActiveChange,
  validate,
  disabled = false,
  'aria-label': ariaLabel,
  children,
}: QuestionnaireProps) {
  const idPrefix = useId()
  const items = allItems.filter((item) => !item.disabled)
  const [uncontrolledActive, setUncontrolledActive] = useState(defaultActive ?? items[0]?.name)
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultValues ?? {})
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  // A host-chosen or remembered item that is now disabled or gone falls back to
  // the first item rather than leaving nothing on screen.
  const requested = active ?? uncontrolledActive
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.name === requested),
  )
  const activeItem = items[activeIndex]
  const isLast = activeIndex === items.length - 1

  function requestFocus(name: string, target: FocusRequest['target']) {
    setFocusRequest((current) => ({ name, target, serial: (current?.serial ?? 0) + 1 }))
  }

  function goTo(name: string) {
    if (active === undefined) {
      setUncontrolledActive(name)
    }

    onActiveChange?.(name)
    requestFocus(name, 'item')
  }

  function check(item: QuestionnaireItemConfig, from: QuestionnaireAnswers): string | null {
    const answer = from[item.name] ?? emptyAnswer

    if (answer.skipped && !item.required) {
      return null
    }

    if (item.required && !hasAnswer(answer)) {
      return REQUIRED_MESSAGE
    }

    return validate?.(item.name, answer) ?? null
  }

  function fail(name: string, message: string) {
    setErrors((current) => ({ ...current, [name]: message }))
    requestFocus(name, 'control')
  }

  function submitAll(from: QuestionnaireAnswers) {
    for (const item of items) {
      const message = check(item, from)

      if (message) {
        if (item.name !== activeItem?.name) {
          if (active === undefined) {
            setUncontrolledActive(item.name)
          }

          onActiveChange?.(item.name)
        }

        fail(item.name, message)

        return
      }
    }

    onSubmit(Object.fromEntries(items.map((item) => [item.name, from[item.name] ?? emptyAnswer])))
  }

  function update(name: string, change: (answer: QuestionnaireAnswer) => QuestionnaireAnswer) {
    setAnswers((current) => ({
      ...current,
      [name]: { ...change(current[name] ?? emptyAnswer), skipped: false },
    }))
    // An answer being changed is the learner acting on the error, so it goes.
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const context: RootContextValue = {
    idPrefix,
    items,
    activeName: activeItem?.name,
    activeIndex,
    answers,
    errors,
    disabled,
    focusRequest,
    setChoice: (name, value, multiple, checked) =>
      update(name, (answer) => {
        if (!multiple) {
          // One fixed answer or one written answer, never both.
          return { ...answer, choices: checked ? [value] : [], text: checked ? '' : answer.text }
        }

        const others = answer.choices.filter((choice) => choice !== value)

        return { ...answer, choices: checked ? [...others, value] : others }
      }),
    setText: (name, text, multiple) =>
      update(name, (answer) => ({
        ...answer,
        text,
        choices: multiple || text.length === 0 ? answer.choices : [],
      })),
    previous: () => {
      const previousItem = items[activeIndex - 1]

      if (previousItem && !disabled) {
        goTo(previousItem.name)
      }
    },
    next: () => {
      if (!activeItem || disabled) {
        return
      }

      const message = check(activeItem, answers)

      if (message) {
        fail(activeItem.name, message)

        return
      }

      const nextItem = items[activeIndex + 1]

      if (nextItem) {
        goTo(nextItem.name)
      }
    },
    skip: () => {
      if (!activeItem || activeItem.required || disabled) {
        return
      }

      const skipped = { ...answers, [activeItem.name]: { ...emptyAnswer, skipped: true } }

      setAnswers(skipped)
      setErrors((current) => ({ ...current, [activeItem.name]: undefined }))

      const nextItem = items[activeIndex + 1]

      if (nextItem) {
        goTo(nextItem.name)
      } else {
        submitAll(skipped)
      }
    },
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (disabled) {
      return
    }

    // Enter inside an answer submits the form. Before the last item that means
    // "next", which is what the learner pressing Enter on a step expects.
    if (isLast) {
      submitAll(answers)
    } else {
      context.next()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={ariaLabel}>
      <RootContext value={context}>
        <Stack gap="lg">{children}</Stack>
      </RootContext>
    </form>
  )
}

export function QuestionnaireProgress() {
  const { items, activeIndex } = useRoot()

  if (items.length === 0) {
    return null
  }

  const position = activeIndex + 1
  const label = `Question ${position} of ${items.length}`

  return (
    <Stack gap={6}>
      {/* The progressbar carries the same words as its name, so this is for eyes only. */}
      <Text size="sm" c="dimmed" aria-hidden="true">
        {label}
      </Text>
      <Progress value={(position / items.length) * 100} size="sm" aria-label={label} />
    </Stack>
  )
}

type ItemContextValue = {
  name: string
  multiple: boolean
  required: boolean
  error: string | undefined
  titleId: string
  descriptionId: string
  errorId: string
  setHasDescription: (has: boolean) => void
}

const ItemContext = createContext<ItemContextValue | null>(null)

function useItem() {
  const context = use(ItemContext)

  if (!context) {
    throw new Error('This part must be rendered inside <QuestionnaireItem>.')
  }

  return context
}

type QuestionnaireItemProps = PropsWithChildren<{
  name: string
  /** Fixed choices become checkboxes rather than radios. */
  multiple?: boolean
}>

/**
 * Renders only while it is the active item. An inactive item is absent rather
 * than hidden: its answer lives in the root, so nothing is lost, and nothing a
 * keyboard or a screen reader could stumble into is left behind.
 */
export function QuestionnaireItem({ name, multiple = false, children }: QuestionnaireItemProps) {
  const { activeName } = useRoot()

  if (activeName !== name) {
    return null
  }

  return (
    <ActiveItem name={name} multiple={multiple}>
      {children}
    </ActiveItem>
  )
}

function ActiveItem({
  name,
  multiple,
  children,
}: Required<Omit<QuestionnaireItemProps, 'children'>> & PropsWithChildren) {
  const root = useRoot()
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const baseId = useId()
  const [hasDescription, setHasDescription] = useState(false)
  const config = root.items.find((item) => item.name === name)
  const error = root.errors[name]

  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-description`
  const errorId = `${baseId}-error`

  const { focusRequest } = root

  useEffect(() => {
    if (!focusRequest || focusRequest.name !== name) {
      return
    }

    const fieldset = fieldsetRef.current

    if (focusRequest.target === 'item') {
      fieldset?.focus()
    } else {
      fieldset
        ?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled])')
        ?.focus()
    }
  }, [focusRequest, name])

  const describedBy = [hasDescription ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <ItemContext
      value={{
        name,
        multiple,
        required: Boolean(config?.required),
        error,
        titleId,
        descriptionId,
        errorId,
        setHasDescription,
      }}
    >
      <fieldset
        ref={fieldsetRef}
        className={styles.item}
        // Focusable from script only, so a successful step can land the learner
        // on the new question and have its legend read out.
        tabIndex={-1}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        data-invalid={error ? true : undefined}
        disabled={root.disabled}
      >
        {children}
      </fieldset>
    </ItemContext>
  )
}

export function QuestionnaireTitle({ children }: PropsWithChildren) {
  const { titleId } = useItem()

  return (
    <legend id={titleId} className={styles.title}>
      {children}
    </legend>
  )
}

export function QuestionnaireDescription({ children }: PropsWithChildren) {
  const { descriptionId, setHasDescription } = useItem()

  useEffect(() => {
    setHasDescription(true)

    return () => setHasDescription(false)
  }, [setHasDescription])

  return (
    <Text id={descriptionId} c="dimmed" size="sm" mb="sm">
      {children}
    </Text>
  )
}

export function QuestionnaireChoices({ children }: PropsWithChildren) {
  return <Stack gap="xs">{children}</Stack>
}

type QuestionnaireChoiceProps = PropsWithChildren<{
  value: string
}>

export function QuestionnaireChoice({ value, children }: QuestionnaireChoiceProps) {
  const root = useRoot()
  const item = useItem()
  const answer = root.answers[item.name] ?? emptyAnswer
  const checked = answer.choices.includes(value)
  // One group name per item and per questionnaire, so the arrow keys stay inside
  // this question's radios even when two questionnaires share a page.
  const groupName = `${root.idPrefix}-${item.name}`
  const controlProps = {
    name: groupName,
    value,
    checked,
    disabled: root.disabled,
    'aria-invalid': item.error ? true : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      root.setChoice(item.name, value, item.multiple, event.currentTarget.checked),
    mt: 2,
  }

  return (
    // The label wraps the control and the words, so the whole row is the target
    // and the input takes its accessible name from the words beside it.
    <Paper
      component="label"
      className={styles.choice}
      data-checked={checked || undefined}
      data-disabled={root.disabled || undefined}
    >
      {item.multiple ? <Checkbox {...controlProps} /> : <Radio {...controlProps} />}
      <Box component="span" className={styles.choiceBody}>
        {children}
      </Box>
    </Paper>
  )
}

/**
 * A freeform answer, beside fixed choices or on its own. Give it an accessible
 * name with `label`, `aria-label` or `aria-labelledby`: a placeholder is not one.
 */
export function QuestionnaireInput(
  props: Omit<TextareaProps, 'value' | 'defaultValue' | 'onChange' | 'name' | 'error'>,
) {
  const root = useRoot()
  const item = useItem()
  const answer = root.answers[item.name] ?? emptyAnswer

  return (
    <Textarea
      // Not autosized, for the reason the recall block gives: the autosizing
      // variant measures a live DOM it does not get under the test renderer.
      rows={3}
      {...props}
      value={answer.text}
      // A boolean error paints the field and sets `aria-invalid` without
      // printing a second copy of the message QuestionnaireError already shows.
      error={Boolean(item.error)}
      disabled={root.disabled}
      onChange={(event) => root.setText(item.name, event.currentTarget.value, item.multiple)}
    />
  )
}

export function QuestionnaireError({ children }: { children?: ReactNode }) {
  const { error, errorId } = useItem()

  if (!error) {
    return null
  }

  return (
    <Text id={errorId} role="alert" size="sm" mt="xs" c="var(--mantine-color-error)">
      {children ?? error}
    </Text>
  )
}

export function QuestionnaireActions({ children }: PropsWithChildren) {
  return (
    <Group justify="flex-end" gap="sm">
      {children}
    </Group>
  )
}

type ActionProps = Omit<ButtonProps, 'type'> & { children?: ReactNode }

export function QuestionnairePrevious({ children = 'Back', ...props }: ActionProps) {
  const root = useRoot()

  if (root.activeIndex === 0) {
    return null
  }

  return (
    <Button
      type="button"
      variant="subtle"
      color="gray"
      mr="auto"
      disabled={root.disabled}
      onClick={root.previous}
      {...props}
    >
      {children}
    </Button>
  )
}

export function QuestionnaireSkip({ children = 'Skip', ...props }: ActionProps) {
  const root = useRoot()
  const active = root.items[root.activeIndex]

  if (!active || active.required) {
    return null
  }

  return (
    <Button type="button" variant="subtle" disabled={root.disabled} onClick={root.skip} {...props}>
      {children}
    </Button>
  )
}

export function QuestionnaireNext({ children = 'Next', ...props }: ActionProps) {
  const root = useRoot()

  if (root.activeIndex >= root.items.length - 1) {
    return null
  }

  return (
    <Button type="button" disabled={root.disabled} onClick={root.next} {...props}>
      {children}
    </Button>
  )
}

export function QuestionnaireSubmit({ children = 'Submit', ...props }: ActionProps) {
  const root = useRoot()

  if (root.activeIndex < root.items.length - 1) {
    return null
  }

  return (
    <Button type="submit" disabled={root.disabled} {...props}>
      {children}
    </Button>
  )
}
