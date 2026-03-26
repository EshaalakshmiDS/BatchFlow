from fastapi import HTTPException, status


class JobNotFoundException(HTTPException):
    def __init__(self, job_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )


class JobNotCompletedException(HTTPException):
    def __init__(self, job_id: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job {job_id} is not yet completed",
        )


class InvalidFileTypeException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only CSV files are accepted",
        )
