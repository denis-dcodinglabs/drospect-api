export class UserDTO {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
