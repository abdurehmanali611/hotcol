/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import React from "react";
import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import {
  AlertTriangle,
  Calendar1,
  Mail,
  Upload,
  User,
  User2,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { CldUploadButton } from "next-cloudinary";
import { ITEM_REGISTRATION_MEDIA_UPLOAD_OPTIONS } from "@/lib/cloudinaryUploadOptions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import clsx from "clsx";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import dynamic from "next/dynamic";

const PhoneInput = dynamic(
  () => import("./phone-input").then((mod) => mod.PhoneInput),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-gray-200"></div>
    ),
  },
);

export enum formFieldTypes {
  INPUT = "input",
  CALENDAR = "calendar",
  RADIO_BUTTON = "radioButton",
  SELECT = "select",
  TEXTAREA = "textarea",
  IMAGE_UPLOADER = "imageUploader",
  SKELETON = "skeleton",
  ALERTDIALOG = "alertDialog",
  SWITCH = "switch",
  PHONE_INPUT = "phoneInput",
  CHECKBOX_GROUP = "checkboxGroup",
}

interface BaseProps {
  label?: string;
  isNumeric?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
  renderSkeleton?: (field: any) => React.ReactNode;
  fieldType: formFieldTypes;
  preHistory?: React.Dispatch<React.SetStateAction<boolean>>;
  listdisplay?: Array<any>;
  isDoctorList?: boolean;
  previewUrl?: string | null;
  fileType?: "image" | "video" | null;
  handleCloudinary?: (result: any) => void;
  icon?: typeof User | typeof Mail | typeof User2 | typeof Calendar1;
  type?: string;
  reason?: React.Dispatch<React.SetStateAction<string>>;
  typeInsurance?: React.Dispatch<React.SetStateAction<string>>;
  setPassKey?: React.Dispatch<React.SetStateAction<string>>;
  setDialogError?: React.Dispatch<React.SetStateAction<string | null>>;
  handleAlertDialog?: (result: any) => void;
  passKey?: string;
  dialogError?: string | null;
  add?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  formItemClassName?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}

interface FormConnectedProps extends BaseProps {
  control: Control<any>;
  name: string;
  fieldType:
    | formFieldTypes.INPUT
    | formFieldTypes.TEXTAREA
    | formFieldTypes.CALENDAR
    | formFieldTypes.RADIO_BUTTON
    | formFieldTypes.SELECT
    | formFieldTypes.IMAGE_UPLOADER
    | formFieldTypes.SKELETON
    | formFieldTypes.SWITCH
    | formFieldTypes.PHONE_INPUT
    | formFieldTypes.CHECKBOX_GROUP;
}

interface AlertDialogProps extends BaseProps {
  fieldType: formFieldTypes.ALERTDIALOG;
  listdisplay: Array<any>;
  setPassKey: React.Dispatch<React.SetStateAction<string>>;
  setDialogError: React.Dispatch<React.SetStateAction<string | null>>;
  handleAlertDialog: (result: any) => void;
  passKey?: string;
  dialogError?: string | null;
}

type customProps = FormConnectedProps | AlertDialogProps;

const RenderInput = ({ field, props }: { field: any; props: customProps }) => {
  const [open, setOpen] = React.useState(false);
  const [localValue, setLocalValue] = React.useState("");

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
    return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  switch (props.fieldType) {
    case formFieldTypes.INPUT:
      return (
        <div className="flex w-full min-w-0 items-center gap-3">
          {props.icon ? (
            <span className="shrink-0 [&_svg]:size-5">
              <props.icon />
            </span>
          ) : null}
          <FormControl className="w-full min-w-0">
            <div className="flex w-full min-w-0 flex-col gap-2">
              <Input
                placeholder={props.placeholder}
                type={props.type}
                onChange={(e) => {
                  if (props.add) {
                    setLocalValue(e.target.value);
                  } else {
                    if (props.type === "number") {
                      const value = e.target.value;
                      const numValue = value === "" ? 0 : parseFloat(value);
                      field.onChange(numValue);
                    } else {
                      field.onChange(e.target.value);
                    }
                  }
                }}
                value={
                  props.add
                    ? localValue
                    : props.type === "number"
                      ? field.value === undefined || field.value === null
                        ? ""
                        : field.value
                      : (field.value ?? "")
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    localValue.trim() !== "" &&
                    props.add
                  ) {
                    e.preventDefault();
                    const newValue = localValue.trim();
                    const currentArray = Array.isArray(field.value)
                      ? field.value
                      : [];
                    field.onChange([...currentArray, newValue]);
                    setLocalValue("");
                  }
                }}
                className={clsx(
                  "w-full min-w-0",
                  props.inputClassName,
                  {
                    "h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200":
                      !props.inputClassName && !props.add,
                  },
                )}
                disabled={props.disabled}
                required={props.required}
                readOnly={props.readOnly}
                autoFocus={props.autoFocus}
                autoComplete={props.autoComplete}
              />
              {props.add && (
                <div className="flex flex-col flex-wrap gap-2 max-h-24 overflow-y-auto p-2 border rounded-md">
                  {(Array.isArray(field.value) ? field.value : []).map(
                    (a: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded text-sm flex items-start"
                      >
                        {a}
                        <button
                          type="button"
                          className="text-red-500 ml-2 cursor-pointer"
                          onClick={() => {
                            const currentArray = Array.isArray(field.value)
                              ? field.value
                              : [];
                            const next = currentArray.filter(
                              (_: string, idx: number) => idx !== i,
                            );
                            field.onChange(next);
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          </FormControl>
        </div>
      );

    case formFieldTypes.SWITCH:
      return (
        <FormControl>
          <Switch
            id={props.placeholder}
            disabled={props.disabled}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
          />
        </FormControl>
      );

    case formFieldTypes.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            placeholder={props.placeholder}
            {...field}
            className={clsx("w-80 h-36 ml-4", props.inputClassName)}
            disabled={props.disabled}
            required={props.required}
            readOnly={props.readOnly}
            autoFocus={props.autoFocus}
          />
        </FormControl>
      );

    case formFieldTypes.PHONE_INPUT:
      return (
        <FormControl>
          <PhoneInput
            defaultCountry="ET"
            countryCallingCodeEditable
            international
            {...field}
            placeholder={props.placeholder}
            className={clsx(props.inputClassName)}
            disabled={props.disabled}
            required={props.required}
            readOnly={props.readOnly}
            autoFocus={props.autoFocus}
          />
        </FormControl>
      );

    case formFieldTypes.CALENDAR:
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={clsx(
                "w-fit justify-between ml-6 font-normal cursor-pointer",
                props.inputClassName,
              )}
              disabled={props.disabled}
              type="button"
            >
              <Calendar1 className="mr-2 h-4 w-4" />
              {field.value ? field.value.toDateString() : "Select Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value}
              captionLayout="dropdown"
              buttonVariant="ghost"
              onSelect={(date) => {
                field.onChange(date);
                setOpen(!open);
              }}
              classNames={{
                day: "cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground",
              }}
            />
          </PopoverContent>
        </Popover>
      );

    case formFieldTypes.CHECKBOX_GROUP:
      return (
        <FormControl>
          <div
            className={clsx(
              "grid sm:grid-cols-2 gap-3 rounded-md border p-4 bg-muted/30",
              props.inputClassName,
            )}
          >
            {(props.listdisplay as string[] | undefined)?.map((mod) => (
              <div key={mod} className="flex items-center gap-2 space-y-0">
                <Checkbox
                  id={`${props.name}-${mod}`}
                  checked={Boolean(
                    Array.isArray(field.value) && field.value.includes(mod),
                  )}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(field.value) ? field.value : [];
                    if (checked === true) {
                      field.onChange([...current, mod]);
                    } else {
                      field.onChange(current.filter((m: string) => m !== mod));
                    }
                  }}
                />
                <Label
                  htmlFor={`${props.name}-${mod}`}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {mod}
                </Label>
              </div>
            ))}
          </div>
        </FormControl>
      );

    case formFieldTypes.RADIO_BUTTON:
      return (
        <RadioGroup
          className={clsx("flex gap-6 h-11", props.inputClassName)}
          onValueChange={(item) => {
            field.onChange(item);
            if (props.reason) {
              if (item === "CheckUp") props.reason("CheckUp");
              else if (item === "Disease") props.reason("Disease");
            }
          }}
          value={field.value}
          disabled={props.disabled}
          required={props.required}
        >
          {props.listdisplay?.map((item) => (
            <div key={item} className="flex gap-2 items-center cursor-pointer">
              <RadioGroupItem
                value={item}
                id={item}
                className="cursor-pointer"
                disabled={props.disabled}
              />
              <Label htmlFor={item} className="cursor-pointer">
                {item}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case formFieldTypes.SELECT:
      return (
        <Select
          value={
            field.value !== undefined &&
            field.value !== null &&
            field.value !== "" &&
            !(props.isNumeric && Number(field.value) === -1)
              ? String(field.value)
              : undefined
          }
          onValueChange={(value) => {
            if (props.isNumeric) {
              const numValue = value ? parseInt(value, 10) : undefined;
              field.onChange(isNaN(numValue!) ? undefined : numValue);
            } else {
              field.onChange(value || "");
            }
          }}
          disabled={props.disabled}
          required={props.required}
        >
          <SelectTrigger
            className={clsx(
              "cursor-pointer",
              {
                "w-full p-3": props.isDoctorList,
                "w-full min-w-0": !props.isDoctorList,
              },
              props.inputClassName ?? "h-11 w-full min-w-0",
            )}
          >
            <SelectValue
              placeholder={props.placeholder ?? "Select…"}
              className="text-base leading-normal"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{props.label}</SelectLabel>
              {props.isDoctorList
                ? props.listdisplay?.map(
                    (item) =>
                      item.roleType === "Doctor" && (
                        <Tooltip key={item._id}>
                          <TooltipTrigger
                            className="flex flex-col gap-3"
                            asChild
                          >
                            <div>
                              <SelectItem
                                key={item._id}
                                value={item.Full_Name}
                                className="p-2 w-225"
                                disabled={props.disabled}
                              >
                                <Image
                                  src={item.image}
                                  alt={item.Full_Name || "Icon"}
                                  width={24}
                                  height={24}
                                  loading="eager"
                                  className="rounded-full"
                                />
                                <span className="font-semibold">
                                  {item.Full_Name}
                                </span>
                              </SelectItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{item.Speciality}</TooltipContent>
                        </Tooltip>
                      ),
                  )
                : props.listdisplay?.map((item, index) => {
                    const optionValue =
                      item.realValue !== undefined
                        ? String(item.realValue)
                        : item.value !== undefined
                          ? String(item.value)
                          : item.name !== undefined
                            ? String(item.name)
                            : String(item.id ?? index);
                    const optionLabel =
                      item.label ?? item.name ?? optionValue;
                    return (
                      <SelectItem
                        key={item.id ?? optionValue ?? index}
                        value={optionValue}
                        disabled={item.disabled || props.disabled}
                        className="text-sm py-2.5"
                      >
                        {optionLabel}
                        {item.subText && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {item.subText}
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
            </SelectGroup>
          </SelectContent>
        </Select>
      );

    case formFieldTypes.IMAGE_UPLOADER:
      return (
        <FormControl>
          <div className="flex flex-col items-center gap-4 w-full">
            <CldUploadButton
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME}
              onSuccess={props.handleCloudinary}
              options={{ ...ITEM_REGISTRATION_MEDIA_UPLOAD_OPTIONS }}
              className={clsx(
                "flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
                props.inputClassName,
              )}
            >
              <Upload className="w-4 h-4" />
              {props.previewUrl ? "Change File" : "Choose File"}
            </CldUploadButton>
            {props.previewUrl && (
              <div className="relative flex flex-col items-center">
                <div className="border rounded-lg p-2 bg-gray-50 w-fit">
                  {props.fileType === "video" ||
                  isVideoUrl(props.previewUrl) ? (
                    <div className="relative w-40 h-40">
                      <video
                        src={props.previewUrl}
                        controls
                        className="w-full h-full object-cover rounded-md"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <Image
                      src={props.previewUrl}
                      alt="Uploaded Preview"
                      width={100}
                      height={100}
                      loading="eager"
                      className="rounded-md object-cover"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </FormControl>
      );
    case formFieldTypes.SKELETON:
      return props.renderSkeleton ? props.renderSkeleton(field) : null;
    default:
      return null;
  }
};

const CustomFormField = (props: customProps) => {
  if (props.fieldType === formFieldTypes.ALERTDIALOG) {
    return (
      <>
        {props.listdisplay?.map((item) => (
          <AlertDialog
            key={item}
            onOpenChange={(open) => {
              if (!open) {
                if (props.setPassKey) {
                  props.setPassKey("");
                }
                if (props.setDialogError) {
                  props.setDialogError(null);
                }
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                key={item}
                variant="link"
                className="cursor-pointer text-blue-400 hover:text-red-400"
                disabled={props.disabled}
              >
                {item}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-fit">
              <AlertDialogHeader>
                <AlertDialogTitle asChild>
                  <h4 className="font-serif text-lg font-semibold">
                    {item} Access Verification
                  </h4>
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <p className="text-sm font-normal">
                    Please Enter the PassKey
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              {props.dialogError && (
                <div className="flex items-center text-sm text-red-600 border border-red-300 bg-red-50 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {props.dialogError}
                </div>
              )}
              <InputOTP
                maxLength={6}
                value={props.passKey}
                onChange={(e) => {
                  if (props.setPassKey) props.setPassKey(e);
                }}
                disabled={props.disabled}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={1} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={4} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="cursor-pointer"
                  onClick={() => {
                    if (props.setPassKey) props.setPassKey("");
                    if (props.setDialogError) props.setDialogError(null);
                  }}
                  disabled={props.disabled}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    props.handleAlertDialog?.(item);
                  }}
                  disabled={
                    !props.passKey || props.passKey.length < 6 || props.disabled
                  }
                >
                  Submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </>
    );
  }

  const { control, name, label } = props;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={clsx(
            {
              "flex flex-col items-center gap-3":
                props.fieldType === formFieldTypes.IMAGE_UPLOADER,
              "flex w-full min-w-0 flex-col gap-2":
                props.fieldType !== formFieldTypes.IMAGE_UPLOADER,
            },
            props.formItemClassName,
          )}
        >
          {label && (
            <FormLabel
              className={clsx("text-foreground!", props.labelClassName)}
            >
              {label}
            </FormLabel>
          )}
          <RenderInput field={field} props={props} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;