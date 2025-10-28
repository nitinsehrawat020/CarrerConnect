import { useForm } from "react-hook-form";
import { userGetOne } from "../../type";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { userUpdateSchema } from "../../schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  user: userGetOne;
  onCancel: () => void;
  onSuccess: () => void;
}
const UserEditForm = ({ user, onCancel, onSuccess }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const updateuser = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.user.getOne.queryOptions());
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
        if (error.data?.code === "FORBIDDEN") {
          router.push("/upgrade");
        }
      },
    })
  );
  const form = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      idealJob: user.idealJob ?? "",
      careerPath: user.careerPath ?? "",
      previousJob: user.previousJob ?? "",
      targetCompany: user.targetCompany ?? "",
    },
  });

  const isEdit = !!user?.id;
  const isPending = updateuser.isPending;

  const onSubmit = (values: z.infer<typeof userUpdateSchema>) => {
    if (isEdit) {
      updateuser.mutate({ ...values });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          name="careerPath"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Career Path</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Computer Science" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="idealJob"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ideal Job field</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Full stack Developer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="previousJob"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Previous Job Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Frontend Developer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="targetCompany"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Company</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Goggle" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-x-2">
          {onCancel && (
            <Button
              variant={"ghost"}
              type={"button"}
              onClick={() => {
                onCancel();
              }}
            >
              Cancel
            </Button>
          )}

          <Button type="submit">{isPending ? "Update" : "Updating"}</Button>
        </div>
      </form>
    </Form>
  );
};
export default UserEditForm;
