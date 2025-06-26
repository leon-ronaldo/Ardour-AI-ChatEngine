export interface IPassUser {
  userName: string,
  userId: string,
  profileImage?: string
}

export interface PostNotification {
  postId: string,
  timeStamp: number
}

export interface AccountReqNotification {
  userId: string,
  timeStamp: number
}

export interface IPassAccountReqNotification {
  userId: string,
  userName: string,
  profileImage?: string,
  timeStamp: number;
}

export interface IUserNotification {
  postNotifications: PostNotification[];
  accountReqNotifications: AccountReqNotification[];
}