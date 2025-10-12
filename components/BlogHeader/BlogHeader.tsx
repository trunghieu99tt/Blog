import React from 'react';

// types
import { iAuthor, iPost } from 'lib/types';

import classes from './blogHeader.module.css';

interface Props {
    post: iPost;
}

const BlogHeader = ({ post }: Props) => {
    return (
        <div className={classes.root}>
            {post?.Author?.length > 0 &&
                post.Author.map((author: iAuthor) => {
                    return (
                        <div className={classes.author} key={author.id}>
                            <figure className={classes.authorImageContainer}>
                                <img
                                    src={author.profilePhoto}
                                    className={classes.authorImage}
                                />
                                <figcaption className={classes.authorName}>
                                    {author.fullName}
                                </figcaption>
                            </figure>
                        </div>
                    );
                })}
        </div>
    );
};

export default BlogHeader;
