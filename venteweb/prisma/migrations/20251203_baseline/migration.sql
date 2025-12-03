-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_userId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_referencePostId_fkey";

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_postId_fkey";

-- DropForeignKey
ALTER TABLE "Participation" DROP CONSTRAINT "Participation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Participation" DROP CONSTRAINT "Participation_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_participationId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_userId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followerId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followedId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Section";

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "Interaction";

-- DropTable
DROP TABLE "Participation";

-- DropTable
DROP TABLE "Rating";

-- DropTable
DROP TABLE "Request";

-- DropTable
DROP TABLE "Invitation";

-- DropTable
DROP TABLE "Follow";

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "Permission";

-- DropEnum
DROP TYPE "Level";

-- DropEnum
DROP TYPE "Visibility";

-- DropEnum
DROP TYPE "Category";

-- DropEnum
DROP TYPE "ParticipationType";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "Emoji";

