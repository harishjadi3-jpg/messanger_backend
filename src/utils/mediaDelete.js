import cloudinary from "../config/cloudinary.js";

const deleteFromCloudinary = async (publicId) => {
    try {
        return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.log(error);
        return null;
    }
};

export { deleteFromCloudinary };