import { userRepository } from "@/repositories/user-repository";
import { NotFoundError } from "@/lib/errors";
import { FREE_PROJECT_LIMIT } from "@/lib/constants";
import type { NewUser } from "@/lib/db/schema";

class UserService {
  async ensureUser(clerkId: string, email: string, name: string | null) {
    return userRepository.upsert({
      id: clerkId,
      email,
      name: name ?? null,
      plan: "free",
    });
  }

  async getByClerkId(clerkId: string) {
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundError("User");
    }
    return user;
  }

  async getProjectCount(userId: string): Promise<number> {
    return userRepository.countProjectsByUserId(userId);
  }

  async canCreateProject(userId: string): Promise<boolean> {
    const user = await userRepository.findByClerkId(userId);
    const plan = user?.plan ?? "free";
    if (plan !== "free") {
      return true;
    }
    const count = await userRepository.countProjectsByUserId(userId);
    return count < FREE_PROJECT_LIMIT;
  }
}

export const userService = new UserService();
export { FREE_PROJECT_LIMIT };
